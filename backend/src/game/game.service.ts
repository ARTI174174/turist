import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { resolveLevel } from '../progression/progression.service';

const DAILY_REWARDS = [
  { coins: 50 }, { coins: 100 }, { crystals: 1 }, { crystals: 5 }, { coins: 500 },
  { crystals: 10 }, { coins: 800 }, { crystals: 15 }, { coins: 900 }, { crystals: 20 },
];
const GLASSES = [500, 1000, 2000, 5000, 10000];
const GLOVES = [0, 50, 100, 150, 200];

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async welcomeStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { welcomeSeenAt: true } });
    return { completed: !!user.welcomeSeenAt };
  }

  async completeWelcome(userId: string) {
    await this.prisma.user.updateMany({ where: { id: userId, welcomeSeenAt: null }, data: { welcomeSeenAt: new Date() } });
    return { success: true };
  }

  async daily(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyLoginStreak: true, lastDailyRewardAt: true } });
    const elapsed = user.lastDailyRewardAt ? Date.now() - user.lastDailyRewardAt.getTime() : Infinity;
    const cycleDay = user.dailyLoginStreak === 0 ? 1 : ((user.dailyLoginStreak - 1) % 10) + 1;
    const claimedToday = elapsed < 24 * 60 * 60 * 1000;
    return { streak: user.dailyLoginStreak, cycleDay, rewards: DAILY_REWARDS.map((reward, i) => ({ day: i + 1, ...reward, completed: i + 1 < cycleDay || (i + 1 === cycleDay && claimedToday) })), claimedToday, nextAt: user.lastDailyRewardAt ? new Date(user.lastDailyRewardAt.getTime() + 24 * 60 * 60 * 1000) : null };
  }

  async leaderboard() {
    const users = await this.prisma.user.findMany({ where: { status: 'active' }, select: { id: true, nickname: true, character: { select: { avatarEmoji: true } }, progress: { select: { xp: true } }, _count: { select: { visits: true, friendshipsSent: true } } }, orderBy: { progress: { xp: 'desc' } }, take: 50 });
    return users.map((user, index) => ({ rank: index + 1, id: user.id, nickname: user.nickname, avatar: user.character?.avatarEmoji ?? '🙂', xp: user.progress?.xp ?? 0, level: resolveLevel(user.progress?.xp ?? 0).level, visits: user._count.visits }));
  }

  async medals(userId: string) {
    return this.prisma.expeditionClaim.findMany({ where: { userId }, orderBy: { claimedAt: 'desc' }, select: { id: true, medalName: true, claimedAt: true } });
  }

  async expedition(userId: string) {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthKey = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}`;
    let event = await this.prisma.expeditionEvent.findUnique({ where: { monthKey } });
    const startsAt = now;
    const endsAt = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 1));
    if (!event) {
      // Later months are generated from the shared public catalogue exactly once,
      // so every player receives the same route and medal.
      const eligible = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'public' }, select: { id: true }, take: 500 });
      if (eligible.length < 3) return { active: false, title: 'Великое путешествие', message: 'Новый маршрут готовится. Загляните позже.' };
      const pool = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
      const offset = (now.getUTCFullYear() * 12 + now.getUTCMonth()) % pool.length;
      const route = Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(offset + i * 37) % pool.length]);
      try {
        event = await this.prisma.expeditionEvent.create({ data: { monthKey, poiIds: route.map((p) => p.id), startsAt, endsAt } });
      } catch {
        event = await this.prisma.expeditionEvent.findUniqueOrThrow({ where: { monthKey } });
      }
    }
    const ids = event.poiIds as string[];
    const [points, visits, claim] = await Promise.all([
      this.prisma.poi.findMany({ where: { id: { in: ids } }, include: { category: true } }),
      this.prisma.visit.findMany({ where: { userId, poiId: { in: ids }, visitedAt: { gte: event.startsAt } }, select: { poiId: true } }),
      this.prisma.expeditionClaim.findUnique({ where: { eventId_userId: { eventId: event.id, userId } } }),
    ]);
    const visited = new Set(visits.map((v) => v.poiId));
    return { active: now >= event.startsAt && now < event.endsAt, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, points: ids.map((id) => ({ ...points.find((p) => p.id === id), completed: visited.has(id) })).filter((p) => p.id), readyToClaim: ids.length > 0 && ids.every((id) => visited.has(id)), claimed: !!claim, medal: claim?.medalName ?? null };
  }

  async claimExpedition(userId: string) {
    const current = await this.expedition(userId);
    if (!current.active || !current.readyToClaim || current.claimed) throw new BadRequestException({ code: 'EXPEDITION_NOT_COMPLETE', message: 'Сначала посетите все точки маршрута.' });
    const monthKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`;
    const event = await this.prisma.expeditionEvent.findUniqueOrThrow({ where: { monthKey } });
    const medalName = `Медаль путешественника · ${monthKey}`;
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.expeditionClaim.create({ data: { eventId: event.id, userId, medalName } });
      const wallet = await tx.wallet.update({ where: { userId }, data: { coinsBalance: { increment: 10000 }, crystalsBalance: { increment: 100 } } });
      await tx.transaction.createMany({ data: [
        { walletId: wallet.id, type: 'earn', source: 'monthly_expedition', amount: 10000, currency: 'coins', metadata: { eventId: event.id } },
        { walletId: wallet.id, type: 'earn', source: 'monthly_expedition', amount: 100, currency: 'crystals', metadata: { eventId: event.id } },
      ] });
      return { success: true, medal: claim.medalName, coins: 10000, crystals: 100 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async rouletteStatus(userId: string) {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const challenge = await this.prisma.rouletteChallenge.findUnique({ where: { userId_dayKey: { userId, dayKey } }, include: { poi: { include: { category: true } } } });
    if (!challenge) return { available: true, challenge: null };
    const status = challenge.status === 'active' && challenge.expiresAt <= now ? 'expired' : challenge.status;
    if (status !== challenge.status) await this.prisma.rouletteChallenge.update({ where: { id: challenge.id }, data: { status } });
    return { available: false, challenge: { ...challenge, status } };
  }

  async startRoulette(userId: string) {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const [existing, wallet, visits] = await Promise.all([
      this.prisma.rouletteChallenge.findUnique({ where: { userId_dayKey: { userId, dayKey } } }),
      this.prisma.wallet.findUniqueOrThrow({ where: { userId } }),
      this.prisma.visit.findMany({ where: { userId }, select: { poiId: true } }),
    ]);
    if (existing) throw new BadRequestException({ code: 'ROULETTE_USED_TODAY', message: 'Сегодня вы уже запускали рулетку путешественника.' });
    if (wallet.coinsBalance < 1000) throw new BadRequestException({ code: 'INSUFFICIENT_FUNDS', message: 'Для рулетки нужно 1 000 золота.' });
    const visitedIds = visits.map((v) => v.poiId);
    const candidates = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'public', ...(visitedIds.length ? { id: { notIn: visitedIds } } : {}) }, select: { id: true } });
    if (!candidates.length) throw new BadRequestException({ code: 'NO_DESTINATIONS', message: 'Нет новых точек для путешествия.' });
    const poi = candidates[Math.floor(Math.random() * candidates.length)];
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId }, data: { coinsBalance: { decrement: 1000 } } });
      await tx.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: 'traveler_roulette', amount: 1000, currency: 'coins', metadata: { dayKey } } });
      return tx.rouletteChallenge.create({ data: { userId, dayKey, poiId: poi.id, expiresAt }, include: { poi: { include: { category: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async nearbySecrets(userId: string, lat: number, lng: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
    const visibility = GLASSES[user.glassesLevel] ?? 500;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const deltaLat = visibility / 111_320;
    const deltaLng = visibility / (111_320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    const secrets = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'secret', secretFoundAt: null, lat: { gte: lat - deltaLat, lte: lat + deltaLat }, lng: { gte: lng - deltaLng, lte: lng + deltaLng } }, include: { category: true }, take: 100 });
    const toRad = (value: number) => value * Math.PI / 180;
    return secrets.map((poi) => {
      const dLat = toRad(poi.lat - lat); const dLng = toRad(poi.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(poi.lat)) * Math.sin(dLng / 2) ** 2;
      return { ...poi, distanceMeters: 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), geofenceRadiusM: poi.geofenceRadiusM + (GLOVES[user.glovesLevel] ?? 0) };
    }).filter((poi) => poi.distanceMeters <= visibility).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async unreadNews(userId: string) {
    const post = await this.prisma.newsPost.findFirst({ where: { reads: { none: { userId } } }, orderBy: { publishedAt: 'desc' } });
    return post;
  }

  async readNews(userId: string, postId: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Публикация не найдена');
    await this.prisma.newsRead.upsert({ where: { postId_userId: { postId, userId } }, update: {}, create: { postId, userId } });
    return { success: true };
  }

  async publishNews(user: { userId: string; role: string }, data: { title: string; body: string }) {
    if (user.role !== 'admin') throw new ForbiddenException('Публиковать новости может только администратор.');
    const title = String(data?.title ?? '').trim(); const body = String(data?.body ?? '').trim();
    if (!title || !body || title.length > 120 || body.length > 5000) throw new BadRequestException('Укажите заголовок и текст (до 5 000 символов).');
    return this.prisma.newsPost.create({ data: { title, body, createdBy: user.userId } });
  }

  async getUpgrades(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
    return { glassesLevel: user.glassesLevel, glassesRangeM: GLASSES[user.glassesLevel] ?? 500, glovesLevel: user.glovesLevel, glovesBonusM: GLOVES[user.glovesLevel] ?? 0, items: [
      ...GLASSES.slice(1).map((meters, index) => ({ kind: 'glasses', level: index + 1, meters, price: [10000, 20000, 50000, 100000][index], image: '/assets/shop/glasses.png' })),
      ...GLOVES.slice(1).map((meters, index) => ({ kind: 'gloves', level: index + 1, meters, price: [10000, 20000, 50000, 100000][index], image: '/assets/shop/gloves.png' })),
    ] };
  }

  async buyUpgrade(userId: string, kind: string, level: number) {
    const levels = kind === 'glasses' ? GLASSES : kind === 'gloves' ? GLOVES : null;
    if (!levels || !Number.isInteger(level) || level < 1 || level > 4) throw new BadRequestException('Неизвестное улучшение.');
    const field = kind === 'glasses' ? 'glassesLevel' : 'glovesLevel';
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
    if (level !== user[field] + 1) throw new BadRequestException('Улучшения нужно покупать по порядку.');
    const price = [10000, 20000, 50000, 100000][level - 1];
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    if (wallet.coinsBalance < price) throw new BadRequestException('Недостаточно золота.');
    await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { userId }, data: { coinsBalance: { decrement: price } } }),
      this.prisma.user.update({ where: { id: userId }, data: { [field]: level } }),
      this.prisma.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: `upgrade_${kind}`, amount: price, currency: 'coins', metadata: { kind, level } } }),
    ]);
    return this.getUpgrades(userId);
  }
}
