import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { resolveLevel } from '../progression/progression.service';
import { getUpgradeSettings } from '../common/game-upgrades';

const DAILY_REWARDS: Array<{ coins?: number; crystals?: number }> = [
  { coins: 50 }, { coins: 100 }, { crystals: 1 }, { crystals: 5 }, { coins: 500 },
  { crystals: 10 }, { coins: 800 }, { crystals: 15 }, { coins: 900 }, { crystals: 20 },
];

function yekaterinburgDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async welcomeStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { privacySettings: true } });
    const settings = user.privacySettings && typeof user.privacySettings === 'object' && !Array.isArray(user.privacySettings) ? user.privacySettings as Record<string, unknown> : {};
    const required = settings.tutorialRequired === true;
    return { completed: !required, pointFound: settings.tutorialPointFound === true };
  }

  async completeWelcome(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { privacySettings: true } });
    const settings = user.privacySettings && typeof user.privacySettings === 'object' && !Array.isArray(user.privacySettings) ? user.privacySettings as Record<string, unknown> : {};
    if (settings.tutorialRequired === true && settings.tutorialPointFound !== true) {
      throw new BadRequestException({ code: 'TUTORIAL_POINT_REQUIRED', message: 'Сначала откройте стартовую точку рядом с Челябинском.' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { welcomeSeenAt: new Date(), privacySettings: { ...settings, tutorialRequired: false } as Prisma.InputJsonValue } });
    return { success: true };
  }

  async campStats(userId: string) {
    const [total, visits] = await Promise.all([
      this.prisma.poi.count({ where: { status: 'active', visibility: 'public', regionCode: 'RU-CHE' } }),
      this.prisma.visit.findMany({ where: { userId, poi: { status: 'active', regionCode: 'RU-CHE' } }, select: { poi: { select: { category: { select: { code: true } } } } } }),
    ]);
    const codes = visits.map((visit) => visit.poi.category.code);
    const cities = codes.filter((code) => ['city', 'township', 'village'].includes(code)).length;
    const mountains = codes.filter((code) => code === 'mountain').length;
    const lakes = codes.filter((code) => code === 'lake').length;
    const historic = codes.filter((code) => ['historic', 'monument'].includes(code)).length;
    return { visited: visits.length, total, percent: total ? Math.min(100, Math.floor(visits.length / total * 100)) : 0, mountains, lakes, historic, cities };
  }

  async secretCompass(userId: string, lat: number, lng: number) {
    const ownsCompass = await this.prisma.inventoryItem.findFirst({ where: { userId, shopItem: { name: 'Компас искателя' } }, select: { id: true } });
    if (!ownsCompass || !Number.isFinite(lat) || !Number.isFinite(lng)) return { enabled: !!ownsCompass, distanceMeters: null };
    const secrets = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'secret', secretFoundAt: null }, select: { lat: true, lng: true } });
    const toRad = (n: number) => n * Math.PI / 180;
    const distances = secrets.map((poi) => {
      const dLat = toRad(poi.lat - lat); const dLng = toRad(poi.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(poi.lat)) * Math.sin(dLng / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    });
    return { enabled: true, distanceMeters: distances.length ? Math.round(Math.min(...distances)) : null };
  }

  async daily(userId: string) {
    const now = new Date();
    const today = yekaterinburgDateKey(now);
    const previousDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)) - 1)).toISOString().slice(0, 10);
    const nextAt = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)) + 1) - 5 * 60 * 60 * 1000);
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyLoginStreak: true, lastDailyRewardAt: true } });
      const lastDay = user.lastDailyRewardAt ? yekaterinburgDateKey(user.lastDailyRewardAt) : null;
      const claimedToday = lastDay === today;
      const streak = claimedToday ? user.dailyLoginStreak : lastDay === previousDay ? user.dailyLoginStreak + 1 : 1;
      let reward: { coins?: number; crystals?: number } | null = null;
      if (!claimedToday) {
        const scheduled = DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length];
        const currency = 'coins' in scheduled ? 'coins' : 'crystals';
        const amount = scheduled.coins ?? scheduled.crystals ?? 0;
        await tx.user.update({ where: { id: userId }, data: { dailyLoginStreak: streak, lastDailyRewardAt: now } });
        const wallet = await tx.wallet.update({ where: { userId }, data: currency === 'coins' ? { coinsBalance: { increment: amount } } : { crystalsBalance: { increment: amount } } });
        await tx.transaction.create({ data: { walletId: wallet.id, type: 'earn', source: 'daily_login', amount, currency, metadata: { streak } } });
        reward = currency === 'coins' ? { coins: amount } : { crystals: amount };
      }
      return { streak, claimedToday: true, reward, nextAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const cycleDay = ((result.streak - 1) % DAILY_REWARDS.length) + 1;
    return { ...result, cycleDay, rewards: DAILY_REWARDS.map((reward, i) => ({ day: i + 1, ...reward, completed: i + 1 < cycleDay || i + 1 === cycleDay })) };
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
      const eligible = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'public', regionCode: 'RU-CHE' }, select: { id: true, category: { select: { code: true } } }, take: 5000 });
      if (eligible.length < 7) return { active: false, title: 'Экспедиция «Южный Урал»', message: 'Новый маршрут готовится. Загляните позже.' };
      const stageCategories = ['city', 'lake', 'monument', 'park', 'mountain', 'historic', 'rare'];
      const route: typeof eligible = [];
      for (const code of stageCategories) {
        const options = eligible.filter((point) => point.category.code === code && !route.some((selected) => selected.id === point.id));
        const fallback = eligible.filter((point) => !route.some((selected) => selected.id === point.id));
        const pool = options.length ? options : fallback;
        route.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      try {
        event = await this.prisma.expeditionEvent.create({ data: { monthKey, title: 'Экспедиция «Южный Урал»', poiIds: route.map((p) => p.id), startsAt, endsAt } });
      } catch {
        event = await this.prisma.expeditionEvent.findUniqueOrThrow({ where: { monthKey } });
      }
    }
    const ids = event.poiIds as string[];
    const [points, stageIndex, claim] = await Promise.all([
      this.prisma.poi.findMany({ where: { id: { in: ids } }, include: { category: true } }),
      this.prisma.$transaction(async (tx) => {
        const progress = await tx.expeditionProgress.upsert({
          where: { eventId_userId: { eventId: event.id, userId } },
          update: {},
          create: { eventId: event.id, userId, stageIndex: 0 },
          select: { stageIndex: true },
        });
        const priorVisits = await tx.visit.findMany({ where: { userId, poiId: { in: ids } }, select: { poiId: true } });
        const visitedPoiIds = new Set(priorVisits.map((visit) => visit.poiId));
        let nextStage = progress.stageIndex;
        while (nextStage < ids.length && visitedPoiIds.has(ids[nextStage])) nextStage++;
        if (nextStage === progress.stageIndex) return progress.stageIndex;

        const advanced = await tx.expeditionProgress.updateMany({
          where: { eventId: event.id, userId, stageIndex: progress.stageIndex },
          data: { stageIndex: nextStage },
        });
        if (advanced.count === 1) return nextStage;
        const latest = await tx.expeditionProgress.findUniqueOrThrow({ where: { eventId_userId: { eventId: event.id, userId } }, select: { stageIndex: true } });
        return latest.stageIndex;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
      this.prisma.expeditionClaim.findUnique({ where: { eventId_userId: { eventId: event.id, userId } } }),
    ]);
    return { active: now >= event.startsAt && now < event.endsAt, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, stageIndex, points: ids.map((id, index) => ({ ...points.find((p) => p.id === id), completed: index < stageIndex, locked: index > stageIndex })).filter((p) => p.id), readyToClaim: ids.length > 0 && stageIndex >= ids.length, claimed: !!claim, medal: claim?.medalName ?? null };
  }

  async claimExpedition(userId: string) {
    const current = await this.expedition(userId);
    if (!current.active || !current.readyToClaim || current.claimed) throw new BadRequestException({ code: 'EXPEDITION_NOT_COMPLETE', message: 'Сначала посетите все точки маршрута.' });
    const monthKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`;
    const event = await this.prisma.expeditionEvent.findUniqueOrThrow({ where: { monthKey } });
    const medalName = `Экспедиция «Южный Урал» · ${monthKey}`;
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.expeditionClaim.create({ data: { eventId: event.id, userId, medalName } });
      const wallet = await tx.wallet.update({ where: { userId }, data: { coinsBalance: { increment: 50000 }, crystalsBalance: { increment: 50 } } });
      await tx.transaction.createMany({ data: [
        { walletId: wallet.id, type: 'earn', source: 'monthly_expedition', amount: 50000, currency: 'coins', metadata: { eventId: event.id } },
        { walletId: wallet.id, type: 'earn', source: 'monthly_expedition', amount: 50, currency: 'crystals', metadata: { eventId: event.id } },
      ] });
      return { success: true, medal: claim.medalName, coins: 50000, crystals: 50 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async rouletteStatus(userId: string) {
    const now = new Date();
    const dayKey = yekaterinburgDateKey(now);
    const challenges = await this.prisma.rouletteChallenge.findMany({ where: { userId, dayKey }, include: { poi: { include: { category: true } } }, orderBy: { spinIndex: 'desc' } });
    const expired = challenges.filter((c) => c.status === 'active' && c.expiresAt <= now);
    if (expired.length) await this.prisma.rouletteChallenge.updateMany({ where: { id: { in: expired.map((c) => c.id) }, status: 'active' }, data: { status: 'expired' } });
    const latest = challenges[0] ?? null;
    if (latest?.status === 'active' && latest.expiresAt <= now) latest.status = 'expired';
    return { available: challenges.length < 10, used: challenges.length, remaining: Math.max(0, 10 - challenges.length), challenge: latest };
  }

  async startRoulette(userId: string, lat: number, lng: number) {
    const now = new Date();
    const dayKey = yekaterinburgDateKey(now);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new BadRequestException('Для рулетки нужно разрешить геолокацию.');
    const [existing, wallet, visits] = await Promise.all([
      this.prisma.rouletteChallenge.findMany({ where: { userId, dayKey }, select: { spinIndex: true, poiId: true, status: true } }),
      this.prisma.wallet.findUniqueOrThrow({ where: { userId } }),
      this.prisma.visit.findMany({ where: { userId }, select: { poiId: true } }),
    ]);
    if (existing.length >= 10) throw new BadRequestException({ code: 'ROULETTE_LIMIT', message: 'Сегодня можно использовать рулетку не более 10 раз.' });
    if (wallet.coinsBalance < 200) throw new BadRequestException({ code: 'INSUFFICIENT_FUNDS', message: 'Для рулетки нужно 200 золота.' });
    const visitedIds = visits.map((v) => v.poiId);
    const reservedIds = existing.filter((c) => c.status === 'active' && c.poiId).map((c) => c.poiId!);
    const excludedIds = [...visitedIds, ...reservedIds];
    const candidates = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'public', ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}) }, select: { id: true, lat: true, lng: true } });
    const toRad = (n: number) => n * Math.PI / 180;
    const nearby = candidates.filter((p) => {
      const dLat = toRad(p.lat - lat); const dLng = toRad(p.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 20_000;
    });
    const random = Math.random();
    const prize = random < .05 ? { rewardCoins: 5000, rewardCrystals: 0 }
      : random < .055 ? { rewardCoins: 10000, rewardCrystals: 0 }
      : random < .059 ? { rewardCoins: 0, rewardCrystals: 10 }
      : random < .06 ? { rewardCoins: 50000, rewardCrystals: 0 } : null;
    if (!prize && !nearby.length) throw new BadRequestException({ code: 'NO_DESTINATIONS', message: 'В радиусе 20 км пока нет новых точек для рулетки.' });
    const poi = prize ? null : nearby[Math.floor(Math.random() * nearby.length)];
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.rouletteChallenge.count({ where: { userId, dayKey } });
      if (count >= 10) throw new BadRequestException('Сегодня можно использовать рулетку не более 10 раз.');
      const charged = await tx.wallet.updateMany({ where: { userId, coinsBalance: { gte: 200 } }, data: { coinsBalance: { decrement: 200 } } });
      if (!charged.count) throw new BadRequestException('Для рулетки нужно 200 золота.');
      const spinIndex = count + 1;
      const latestWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.transaction.create({ data: { walletId: latestWallet.id, type: 'spend', source: 'traveler_roulette', amount: 200, currency: 'coins', metadata: { dayKey, spinIndex } } });
      if (prize) {
        const balance = await tx.wallet.update({ where: { userId }, data: prize.rewardCoins ? { coinsBalance: { increment: prize.rewardCoins } } : { crystalsBalance: { increment: prize.rewardCrystals } } });
        const currency = prize.rewardCoins ? 'coins' : 'crystals'; const amount = prize.rewardCoins || prize.rewardCrystals;
        await tx.transaction.create({ data: { walletId: balance.id, type: 'earn', source: 'traveler_roulette_prize', amount, currency, metadata: { dayKey, spinIndex } } });
      }
      return tx.rouletteChallenge.create({ data: { userId, dayKey, spinIndex, poiId: poi?.id ?? null, expiresAt, ...(prize ? { ...prize, status: 'completed', completedAt: now } : {}) }, include: { poi: { include: { category: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async nearbySecrets(userId: string, lat: number, lng: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
    const [glasses, gloves] = await Promise.all([getUpgradeSettings(this.prisma, 'glasses'), getUpgradeSettings(this.prisma, 'gloves')]);
    const visibility = glasses[user.glassesLevel]?.effectValue ?? 500;
    const gloveBonus = gloves[user.glovesLevel]?.effectValue ?? 0;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const deltaLat = visibility / 111_320;
    const deltaLng = visibility / (111_320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    const secrets = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'secret', secretFoundAt: null, lat: { gte: lat - deltaLat, lte: lat + deltaLat }, lng: { gte: lng - deltaLng, lte: lng + deltaLng } }, include: { category: true }, take: 100 });
    const toRad = (value: number) => value * Math.PI / 180;
    return secrets.map((poi) => {
      const dLat = toRad(poi.lat - lat); const dLng = toRad(poi.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(poi.lat)) * Math.sin(dLng / 2) ** 2;
      return { ...poi, distanceMeters: 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), geofenceRadiusM: poi.geofenceRadiusM + gloveBonus };
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
    const [glasses, gloves] = await Promise.all([getUpgradeSettings(this.prisma, 'glasses'), getUpgradeSettings(this.prisma, 'gloves')]);
    return { glassesLevel: user.glassesLevel, glassesRangeM: glasses[user.glassesLevel]?.effectValue ?? 500, glovesLevel: user.glovesLevel, glovesBonusM: gloves[user.glovesLevel]?.effectValue ?? 0, items: [
      ...glasses.slice(1).map((setting) => ({ kind: setting.kind, level: setting.level, meters: setting.effectValue, price: setting.priceCoins, image: '/assets/shop/glasses.png' })),
      ...gloves.slice(1).map((setting) => ({ kind: setting.kind, level: setting.level, meters: setting.effectValue, price: setting.priceCoins, image: '/assets/shop/gloves.png' })),
    ] };
  }

  async buyUpgrade(userId: string, kind: string, level: number) {
    if ((kind !== 'glasses' && kind !== 'gloves') || !Number.isInteger(level) || level < 1 || level > 4) throw new BadRequestException('Неизвестное улучшение.');
    const field = kind === 'glasses' ? 'glassesLevel' : 'glovesLevel';
    const settings = await getUpgradeSettings(this.prisma, kind);
    const price = settings[level]?.priceCoins;
    if (price == null) throw new BadRequestException('Для этого уровня не задана цена.');
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
      if (level !== user[field] + 1) throw new BadRequestException('Улучшения нужно покупать по порядку.');
      const charged = await tx.wallet.updateMany({ where: { userId, coinsBalance: { gte: price } }, data: { coinsBalance: { decrement: price } } });
      if (charged.count !== 1) throw new BadRequestException('Недостаточно золота.');
      const updated = await tx.user.updateMany({ where: { id: userId, [field]: user[field] }, data: { [field]: level } });
      if (updated.count !== 1) throw new BadRequestException('Уровень уже изменился. Обновите страницу.');
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: `upgrade_${kind}`, amount: price, currency: 'coins', metadata: { kind, level } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.getUpgrades(userId);
  }

  async changeCamp(userId: string, campThemeId: string) {
    const allowed = ['zyuratkul', 'nurgush', 'taganay', 'ural'];
    if (!allowed.includes(campThemeId)) throw new BadRequestException('Выберите один из доступных лагерей.');
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { campThemeId: true, privacySettings: true } });
      const settings = current.privacySettings && typeof current.privacySettings === 'object' && !Array.isArray(current.privacySettings) ? current.privacySettings as Record<string, unknown> : {};
      const ownedCampThemes = new Set(Array.isArray(settings.ownedCampThemes) ? settings.ownedCampThemes.filter((id): id is string => typeof id === 'string' && allowed.includes(id)) : []);
      if (allowed.includes(current.campThemeId)) ownedCampThemes.add(current.campThemeId);
      const firstChoice = !current.campThemeId || current.campThemeId === 'default';
      const purchased = !firstChoice && !ownedCampThemes.has(campThemeId);
      if (purchased) {
        const charged = await tx.wallet.updateMany({ where: { userId, crystalsBalance: { gte: 20 } }, data: { crystalsBalance: { decrement: 20 } } });
        if (!charged.count) throw new BadRequestException('Для смены лагеря нужно 20 бриллиантов.');
      }
      ownedCampThemes.add(campThemeId);
      const user = await tx.user.update({
        where: { id: userId },
        data: { campThemeId, privacySettings: { ...settings, ownedCampThemes: [...ownedCampThemes] } as Prisma.InputJsonValue },
        select: { campThemeId: true },
      });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (purchased) await tx.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: 'camp_purchase', amount: 20, currency: 'crystals', metadata: { campThemeId } } });
      return { ...user, ownedCampThemes: [...ownedCampThemes], crystalsBalance: wallet.crystalsBalance, purchased };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return result;
  }

  async buyRandomPoint(userId: string) {
    const visited = await this.prisma.visit.findMany({ where: { userId }, select: { poiId: true } });
    const candidates = await this.prisma.poi.findMany({ where: { status: 'active', visibility: 'public', category: { code: { in: ['monument', 'historic', 'rare'] } }, ...(visited.length ? { id: { notIn: visited.map((visit) => visit.poiId) } } : {}) }, include: { category: true }, take: 5000 });
    if (!candidates.length) throw new BadRequestException('Нет новых точек подходящей редкости.');
    const poi = candidates[Math.floor(Math.random() * candidates.length)];
    return this.prisma.$transaction(async (tx) => {
      const charged = await tx.wallet.updateMany({ where: { userId, crystalsBalance: { gte: 20 } }, data: { crystalsBalance: { decrement: 20 } } });
      if (!charged.count) throw new BadRequestException('Для случайной точки нужно 20 бриллиантов.');
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.transaction.create({ data: { walletId: wallet.id, type: 'spend', source: 'random_poi_purchase', amount: 20, currency: 'crystals', metadata: { poiId: poi.id } } });
      return { poi, crystalsBalance: wallet.crystalsBalance };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
