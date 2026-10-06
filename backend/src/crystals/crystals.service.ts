import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { haversineDistanceMeters } from '../common/geo/geo.util';
import { chunkRangeAround, randomPointInChunk } from '../common/geo/chunk.util';
import { getUpgradeSettings } from '../common/game-upgrades';

const PICKUP_RADIUS_M = 50;
const RESPAWN_AFTER_MS = 24 * 60 * 60 * 1000;
const MAGNET_LEVELS = [30, 25, 20, 15, 10];
const MAGNET_UPGRADE_PRICES = [0, 10000, 20000, 50000, 100000];

@Injectable()
export class CrystalsService {
  constructor(private prisma: PrismaService) {}

  async findNearby(userId: string, lat: number, lng: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true } });
    const glasses = await getUpgradeSettings(this.prisma, 'glasses');
    const visibilityRadiusM = glasses[user.glassesLevel]?.effectValue ?? 500;
    const { minChunkX, maxChunkX, minChunkY, maxChunkY } = chunkRangeAround(
      lat,
      lng,
      visibilityRadiusM,
    );
    const chunks: { chunkX: number; chunkY: number; lat: number; lng: number; reward: number }[] = [];
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        const point = randomPointInChunk(chunkX, chunkY);
        chunks.push({ chunkX, chunkY, ...point, reward: 1 });
      }
    }
    await this.prisma.crystal.createMany({ data: chunks, skipDuplicates: true });
    let crystals = await this.prisma.crystal.findMany({
      where: { chunkX: { gte: minChunkX, lte: maxChunkX }, chunkY: { gte: minChunkY, lte: maxChunkY } },
    });
    const stalePicked = crystals.filter((crystal) => crystal.pickedAt && Date.now() - crystal.pickedAt.getTime() > RESPAWN_AFTER_MS);
    if (stalePicked.length) {
      for (const crystal of stalePicked) {
        const point = randomPointInChunk(crystal.chunkX, crystal.chunkY);
        await this.prisma.crystal.updateMany({
          where: { id: crystal.id, pickedAt: { lte: new Date(Date.now() - RESPAWN_AFTER_MS) } },
          data: { ...point, pickedAt: null, pickedByUserId: null },
        });
      }
      crystals = await this.prisma.crystal.findMany({
        where: { chunkX: { gte: minChunkX, lte: maxChunkX }, chunkY: { gte: minChunkY, lte: maxChunkY } },
      });
    }

    return crystals
      .filter((crystal) => crystal.pickedAt === null)
      .map((c) => ({ ...c,
        distanceMeters: haversineDistanceMeters(lat, lng, c.lat, c.lng),
      }))
      .filter((c) => c.distanceMeters <= visibilityRadiusM)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  private async ensureChunkCrystal(chunkX: number, chunkY: number) {
    let crystal = await this.prisma.crystal.findUnique({
      where: { chunkX_chunkY: { chunkX, chunkY } },
    });

    if (!crystal) {
      const point = randomPointInChunk(chunkX, chunkY);
      try {
        crystal = await this.prisma.crystal.create({
          data: { chunkX, chunkY, lat: point.lat, lng: point.lng, reward: 1 },
        });
      } catch {
        crystal = await this.prisma.crystal.findUniqueOrThrow({
          where: { chunkX_chunkY: { chunkX, chunkY } },
        });
      }
      return crystal;
    }

    const isStalePicked =
      crystal.pickedAt &&
      Date.now() - crystal.pickedAt.getTime() > RESPAWN_AFTER_MS;

    if (isStalePicked) {
      const point = randomPointInChunk(chunkX, chunkY);
      crystal = await this.prisma.crystal.update({
        where: { id: crystal.id },
        data: {
          lat: point.lat,
          lng: point.lng,
          pickedAt: null,
          pickedByUserId: null,
        },
      });
    }

    return crystal;
  }

  async collect(userId: string, crystalId: string, lat: number, lng: number) {
    const crystal = await this.prisma.crystal.findUnique({
      where: { id: crystalId },
    });

    if (!crystal) {
      throw new NotFoundException({
        code: 'CRYSTAL_NOT_FOUND',
        message: 'Кристалл не найден',
      });
    }

    if (crystal.pickedAt !== null) {
      throw new BadRequestException({
        code: 'ALREADY_PICKED',
        message: 'Этот кристалл уже собран — вернётся через 24 часа',
      });
    }

    const distance = haversineDistanceMeters(lat, lng, crystal.lat, crystal.lng);
    const player = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glovesLevel: true } });
    const gloves = await getUpgradeSettings(this.prisma, 'gloves');
    const pickupRadius = PICKUP_RADIUS_M + (gloves[player.glovesLevel]?.effectValue ?? 0);
    if (distance > pickupRadius) {
      throw new BadRequestException({
        code: 'TOO_FAR',
        message: `Подойди ближе чем на ${pickupRadius} м, чтобы забрать кристалл`,
      });
    }

    // Атомарная выдача награды. Без этого два параллельных запроса могли
    // одновременно увидеть pickedAt=null и начислить один кристалл дважды.
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.crystal.updateMany({
        where: {
          id: crystalId,
          pickedAt: null,
        },
        data: {
          pickedAt: new Date(),
          pickedByUserId: userId,
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException({
          code: 'ALREADY_PICKED',
          message: 'Этот кристалл уже собран — вернётся через 24 часа',
        });
      }

      await tx.wallet.update({
        where: { userId },
        data: { crystalsBalance: { increment: crystal.reward } },
      });

      await tx.transaction.create({
        data: {
          wallet: { connect: { userId } },
          type: 'earn',
          source: 'crystal_pickup',
          amount: crystal.reward,
          currency: 'crystals',
          metadata: { crystalId },
        },
      });

      return { success: true, reward: crystal.reward };
    });
  }

  async magnetStatus(userId: string) {
    const [item, user] = await Promise.all([
      this.prisma.inventoryItem.findFirst({ where: { userId, shopItem: { name: 'Магнит следопыта' } }, select: { id: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { magnetLevel: true, magnetLastUsedAt: true } }),
    ]);
    const cooldownMinutes = MAGNET_LEVELS[user.magnetLevel] ?? MAGNET_LEVELS[0];
    const readyAt = user.magnetLastUsedAt ? new Date(user.magnetLastUsedAt.getTime() + cooldownMinutes * 60_000) : null;
    return { owned: !!item, level: user.magnetLevel, cooldownMinutes, readyAt, ready: !readyAt || readyAt <= new Date(), nextUpgrade: user.magnetLevel < MAGNET_LEVELS.length - 1 ? { level: user.magnetLevel + 1, cooldownMinutes: MAGNET_LEVELS[user.magnetLevel + 1], priceCoins: MAGNET_UPGRADE_PRICES[user.magnetLevel + 1] } : null };
  }

  async upgradeMagnet(userId: string) {
    const owned = await this.prisma.inventoryItem.findFirst({ where: { userId, shopItem: { name: 'Магнит следопыта' } }, select: { id: true } });
    if (!owned) throw new ForbiddenException('Сначала купите магнит следопыта в магазине.');
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { magnetLevel: true } });
    const next = current.magnetLevel + 1;
    if (next >= MAGNET_LEVELS.length) throw new BadRequestException('Магнит уже улучшен до максимума.');
    const price = MAGNET_UPGRADE_PRICES[next];
    await this.prisma.$transaction(async (tx) => {
      const charged = await tx.wallet.updateMany({ where: { userId, coinsBalance: { gte: price } }, data: { coinsBalance: { decrement: price } } });
      if (!charged.count) throw new BadRequestException(`Для улучшения нужно ${price.toLocaleString('ru-RU')} золота.`);
      const updated = await tx.user.updateMany({ where: { id: userId, magnetLevel: current.magnetLevel }, data: { magnetLevel: next } });
      if (!updated.count) throw new BadRequestException('Уровень магнита уже изменился. Обновите страницу.');
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: 'magnet_upgrade', amount: price, currency: 'coins', metadata: { level: next } } });
    }, { isolationLevel: 'Serializable' });
    return this.magnetStatus(userId);
  }

  async collectWithMagnet(userId: string, lat: number, lng: number) {
    const status = await this.magnetStatus(userId);
    if (!status.owned) throw new ForbiddenException('Сначала купите магнит следопыта в магазине.');
    if (!status.ready) throw new BadRequestException({ code: 'MAGNET_COOLDOWN', message: `Магнит готов ${status.readyAt?.toLocaleTimeString('ru-RU') ?? 'позже'}.` });
    const visible = await this.findNearby(userId, lat, lng);
    if (!visible.length) throw new BadRequestException('На карте рядом нет бриллиантов для магнита.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { magnetLastUsedAt: true, magnetLevel: true } });
      const cooldown = MAGNET_LEVELS[user.magnetLevel] ?? MAGNET_LEVELS[0];
      if (user.magnetLastUsedAt && user.magnetLastUsedAt.getTime() + cooldown * 60_000 > Date.now()) throw new BadRequestException('Магнит ещё перезаряжается.');
      const now = new Date();
      const ids = visible.map((crystal) => crystal.id);
      const picked = await tx.crystal.updateMany({ where: { id: { in: ids }, pickedAt: null }, data: { pickedAt: now, pickedByUserId: userId } });
      if (!picked.count) throw new BadRequestException('Эти бриллианты уже собрали другие путешественники.');
      const collected = await tx.crystal.findMany({ where: { id: { in: ids }, pickedByUserId: userId, pickedAt: now }, select: { id: true, reward: true } });
      const reward = collected.reduce((sum, crystal) => sum + crystal.reward, 0);
      await tx.user.update({ where: { id: userId }, data: { magnetLastUsedAt: now } });
      const wallet = await tx.wallet.update({ where: { userId }, data: { crystalsBalance: { increment: reward } } });
      await tx.transaction.createMany({ data: collected.map((crystal) => ({ walletId: wallet.id, type: 'earn' as const, source: 'magnet_pickup', amount: crystal.reward, currency: 'crystals' as const, metadata: { crystalId: crystal.id } })) });
      return { count: collected.length, reward, cooldownMinutes: cooldown };
    }, { isolationLevel: 'Serializable' });
  }
}
