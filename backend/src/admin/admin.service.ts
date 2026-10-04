import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoiVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { toChunk } from '../common/geo/chunk.util';
import { resolveLevel } from '../progression/progression.service';
import { getUpgradeSettings, UpgradeKind } from '../common/game-upgrades';

type PoiInput = { title: string; categoryCode?: string; category?: string; lat: number; lng: number; description?: string; type?: string; reward?: number; xp?: number; coins?: number; crystals?: number; radius?: number; visibility?: string };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private object(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Ожидались данные в формате JSON-объекта');
    return value as Record<string, any>;
  }
  private number(value: unknown, field: string, min: number, max: number) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`Проверьте поле «${field}»`);
    return n;
  }
  private async category(code: unknown) {
    if (typeof code !== 'string' || !code.trim()) throw new BadRequestException('Укажите вид точки');
    const row = await this.prisma.poiCategory.findUnique({ where: { code: code.trim() } });
    if (!row) throw new BadRequestException(`Неизвестный вид точки: ${code}`);
    return row;
  }
  private async normalizePoi(raw: unknown, categoryCache?: Map<string, any>) {
    const item = this.object(raw) as PoiInput;
    const title = String(item.title ?? '').trim();
    if (!title || title.length > 180) throw new BadRequestException('Название должно быть от 1 до 180 символов');
    const categoryCode = item.categoryCode ?? item.category ?? item.type;
    const category = categoryCache?.get(String(categoryCode ?? '').trim()) ?? await this.category(categoryCode);
    const lat = this.number(item.lat, 'широта', -90, 90);
    const lng = this.number(item.lng, 'долгота', -180, 180);
    const legacyReward = item.reward;
    const xp = Math.round(this.number(item.xp ?? legacyReward ?? 300, 'опыт', 0, 1_000_000));
    const coins = Math.round(this.number(item.coins ?? legacyReward ?? xp, 'золото', 0, 1_000_000_000));
    const crystals = Math.round(this.number(item.crystals ?? 0, 'бриллианты', 0, 1_000_000));
    const radius = Math.round(this.number(item.radius ?? 30, 'радиус', 1, 100_000));
    const visibility = item.visibility === 'secret' || category.code === 'secret' ? PoiVisibility.secret : PoiVisibility.public;
    return {
      title, categoryId: category.id, markerAsset: category.iconAsset, lat, lng,
      descriptionHistory: String(item.description ?? '').trim() || null,
      interestingFacts: [], baseXp: xp, baseCoins: coins, baseCrystals: crystals,
      geofenceRadiusM: radius, visibility, status: 'active' as const,
    };
  }

  async overview() {
    const [poi, players, shopItems, crystals] = await this.prisma.$transaction([
      this.prisma.poi.count({ where: { status: 'active' } }), this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.shopItem.count(), this.prisma.crystal.count({ where: { pickedAt: null } }),
    ]);
    return { poi, players, shopItems, crystals };
  }
  categories() { return this.prisma.poiCategory.findMany({ orderBy: { title: 'asc' } }); }
  mapPreview() {
    return this.prisma.poi.findMany({
      where: { status: 'active', visibility: 'public' },
      select: { id: true, title: true, lat: true, lng: true, baseXp: true, baseCoins: true, baseCrystals: true, geofenceRadiusM: true, category: { select: { code: true, title: true, colorHex: true } } },
      orderBy: { title: 'asc' }, take: 5000,
    });
  }
  listPoi(search?: string) {
    const q = search?.trim();
    return this.prisma.poi.findMany({ where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { descriptionHistory: { contains: q, mode: 'insensitive' } }] } : {}, include: { category: true }, orderBy: { title: 'asc' }, take: 5000 });
  }
  async bulkPoi(rawItems: unknown) {
    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 2000) throw new BadRequestException('Добавьте от 1 до 2000 точек за один раз');
    const categoryRows = await this.prisma.poiCategory.findMany();
    const categoryCache = new Map(categoryRows.map((row) => [row.code, row]));
    const normalized = await Promise.all(rawItems.map((item) => this.normalizePoi(item, categoryCache)));
    const keys = new Set<string>();
    const titles = new Set<string>();
    for (const poi of normalized) {
      const key = `${poi.lat.toFixed(6)},${poi.lng.toFixed(6)}`;
      if (keys.has(key)) throw new ConflictException(`В списке повторяются координаты ${key}`);
      keys.add(key);
      const titleKey = poi.title.toLocaleLowerCase('ru-RU');
      if (titles.has(titleKey)) throw new ConflictException(`В списке повторяется название «${poi.title}»`);
      titles.add(titleKey);
    }
    const existingRows = await this.prisma.poi.findMany({ where: { title: { in: normalized.map((poi) => poi.title) } }, select: { id: true, title: true } });
    const existingByTitle = new Map(existingRows.map((row) => [row.title.toLocaleLowerCase('ru-RU'), row]));
    const result = await this.prisma.$transaction(async (tx) => {
      let updated = 0;
      const newRows: Array<(typeof normalized)[number] & { createdBy: string }> = [];
      for (const data of normalized) {
        const existing = existingByTitle.get(data.title.toLocaleLowerCase('ru-RU'));
        if (existing) { await tx.poi.update({ where: { id: existing.id }, data: { ...data, createdBy: 'admin-tool' } }); updated++; }
        else newRows.push({ ...data, createdBy: 'admin-tool' });
      }
      const createResult = newRows.length ? await tx.poi.createMany({ data: newRows }) : { count: 0 };
      return { created: createResult.count, updated };
    }, { maxWait: 10_000, timeout: 60_000 });
    return { ...result, total: normalized.length };
  }
  async updatePoi(id: string, raw: unknown) {
    const existing = await this.prisma.poi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Точка не найдена');
    const body = this.object(raw);
    const merged = await this.normalizePoi({ title: body.title ?? existing.title, categoryCode: body.categoryCode ?? (await this.prisma.poiCategory.findUniqueOrThrow({ where: { id: existing.categoryId } })).code, lat: body.lat ?? existing.lat, lng: body.lng ?? existing.lng, description: body.description ?? existing.descriptionHistory, xp: body.xp ?? existing.baseXp, coins: body.coins ?? body.reward ?? existing.baseCoins, crystals: body.crystals ?? existing.baseCrystals, radius: body.radius ?? existing.geofenceRadiusM, visibility: body.visibility ?? existing.visibility });
    return this.prisma.poi.update({ where: { id }, data: { ...merged, createdBy: 'admin-tool' }, include: { category: true } });
  }
  async archivePoi(id: string) {
    const row = await this.prisma.poi.updateMany({ where: { id }, data: { status: 'archived' } });
    if (!row.count) throw new NotFoundException('Точка не найдена');
    return { success: true };
  }
  shop() { return this.prisma.shopItem.findMany({ orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }] }); }
  private shopData(raw: unknown): Prisma.ShopItemUncheckedCreateInput {
    const body = this.object(raw); const name = String(body.name ?? '').trim(); const category = String(body.category ?? '').trim();
    if (!name || name.length > 120 || !category || category.length > 50) throw new BadRequestException('Укажите название и категорию товара');
    const priceCoins = body.priceCoins === '' || body.priceCoins == null ? null : Math.round(this.number(body.priceCoins, 'цена в монетах', 0, 1_000_000_000));
    const priceCrystals = body.priceCrystals === '' || body.priceCrystals == null ? null : Math.round(this.number(body.priceCrystals, 'цена в бриллиантах', 0, 1_000_000_000));
    if (priceCoins == null && priceCrystals == null) throw new BadRequestException('Укажите цену в монетах или бриллиантах');
    return { name, category, priceCoins, priceCrystals, rarity: String(body.rarity ?? 'common'), assetUrl: String(body.assetUrl ?? '').trim() || null, active: body.active !== false };
  }
  createShopItem(raw: unknown) { return this.prisma.shopItem.create({ data: this.shopData(raw) }); }
  async updateShopItem(id: string, raw: unknown) {
    if (!(await this.prisma.shopItem.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Товар не найден');
    return this.prisma.shopItem.update({ where: { id }, data: this.shopData(raw) });
  }
  async upgradeSettings() {
    const [glasses, gloves] = await Promise.all([
      getUpgradeSettings(this.prisma, 'glasses'),
      getUpgradeSettings(this.prisma, 'gloves'),
    ]);
    return [...glasses, ...gloves];
  }
  async updateUpgrade(kindInput: string, levelInput: string, raw: unknown) {
    if (kindInput !== 'glasses' && kindInput !== 'gloves') throw new BadRequestException('Неизвестное улучшение');
    const kind = kindInput as UpgradeKind;
    const level = Math.round(this.number(levelInput, 'уровень улучшения', 1, 4));
    const body = this.object(raw);
    const effectValue = Math.round(this.number(body.effectValue, kind === 'glasses' ? 'дальность видимости, м' : 'прибавка к радиусу, м', kind === 'glasses' ? 500 : 0, 100_000));
    const priceCoins = Math.round(this.number(body.priceCoins, 'цена в золоте', 0, 1_000_000_000));
    return this.prisma.shopUpgradeConfig.upsert({
      where: { kind_level: { kind, level } },
      update: { effectValue, priceCoins },
      create: { kind, level, effectValue, priceCoins },
    });
  }
  async players(search?: string) {
    const q = search?.trim();
    const users = await this.prisma.user.findMany({ where: q ? { OR: [{ nickname: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}, select: { id: true, nickname: true, role: true, status: true, createdAt: true, lastLoginAt: true, progress: { select: { xp: true } }, wallet: { select: { coinsBalance: true, crystalsBalance: true } }, _count: { select: { visits: true, friendshipsSent: true, friendshipsReceived: true } } }, orderBy: { createdAt: 'desc' }, take: 5000 });
    return users.map((u) => ({ ...u, level: resolveLevel(u.progress?.xp ?? 0).level, friendsCount: u._count.friendshipsSent + u._count.friendshipsReceived }));
  }
  crystals() { return this.prisma.crystal.findMany({ orderBy: [{ pickedAt: 'asc' }, { createdAt: 'desc' }], take: 10000 }); }
  async createCrystal(raw: unknown) {
    const body = this.object(raw); const lat = this.number(body.lat, 'широта', -90, 90); const lng = this.number(body.lng, 'долгота', -180, 180);
    const reward = Math.round(this.number(body.reward ?? 1, 'награда', 1, 1000)); const chunk = toChunk(lat, lng);
    try { return await this.prisma.crystal.create({ data: { ...chunk, lat, lng, reward } }); }
    catch { throw new ConflictException('На этой части карты уже есть кристалл. Передвиньте существующий или выберите соседнюю область.'); }
  }
  async moveCrystal(id: string, raw: unknown) {
    if (!(await this.prisma.crystal.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Кристалл не найден');
    const body = this.object(raw); const lat = this.number(body.lat, 'широта', -90, 90); const lng = this.number(body.lng, 'долгота', -180, 180);
    try { return await this.prisma.crystal.update({ where: { id }, data: { ...toChunk(lat, lng), lat, lng, reward: body.reward == null ? undefined : Math.round(this.number(body.reward, 'награда', 1, 1000)), pickedAt: null, pickedByUserId: null } }); }
    catch { throw new ConflictException('В этой области карты уже размещён другой кристалл.'); }
  }
  async deleteCrystal(id: string) {
    try { await this.prisma.crystal.delete({ where: { id } }); return { success: true }; }
    catch { throw new NotFoundException('Кристалл не найден'); }
  }
  async snapshot() {
    const [points, items, crystals] = await Promise.all([this.listPoi(), this.shop(), this.crystals()]);
    const upgrades = await this.upgradeSettings();
    return { exportedAt: new Date().toISOString(), points: points.map(({ id, title, lat, lng, descriptionHistory, baseXp, baseCoins, baseCrystals, geofenceRadiusM, visibility, category }) => ({ id, title, lat, lng, descriptionHistory, baseXp, baseCoins, baseCrystals, geofenceRadiusM, visibility, category: category.code })), shop: items, upgrades, crystals: crystals.map(({ id, lat, lng, reward, pickedAt }) => ({ id, lat, lng, reward, pickedAt })) };
  }
}
