import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnticheatService } from './anticheat.service';
import { ProgressionService } from '../progression/progression.service';
import { EconomyService } from '../economy/economy.service';
import { getUpgradeSettings } from '../common/game-upgrades';
import { StartAttemptDto, HeartbeatDto, ProofDto } from './dto/attempt.dto';

const REQUIRED_DWELL_SECONDS = 20;

@Injectable()
export class VisitsService {
  constructor(
    private prisma: PrismaService,
    private anticheat: AnticheatService,
    private progression: ProgressionService,
    private economy: EconomyService,
  ) {}

  /** FR-EXP-01: старт попытки посещения, проверка геозоны. */
  async startAttempt(userId: string, dto: StartAttemptDto) {
    const poi = await this.prisma.poi.findUnique({ where: { id: dto.poiId }, include: { category: true } });
    if (!poi) throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });
    if (poi.visibility === 'secret' && poi.secretFoundAt) throw new BadRequestException({ code: 'SECRET_ALREADY_FOUND', message: 'Эту секретную точку уже нашёл другой путешественник.' });

    const alreadyVisited = await this.prisma.visit.findUnique({
      where: { userId_poiId: { userId, poiId: dto.poiId } },
    });
    if (alreadyVisited) {
      throw new BadRequestException({ code: 'ALREADY_VISITED', message: 'Точка уже открыта' });
    }

    const player = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glovesLevel: true } });
    const gloves = await getUpgradeSettings(this.prisma, 'gloves');
    const gloveBonus = gloves[player.glovesLevel]?.effectValue ?? 0;
    const effectiveRadius = poi.geofenceRadiusM + gloveBonus;
    const { distanceMeters, withinGeofence, lowAccuracy } = this.anticheat.checkGeofence(
      dto.lat,
      dto.lng,
      poi.lat,
      poi.lng,
      effectiveRadius,
      dto.accuracyM,
    );

    await this.anticheat.recordGeoLog(userId, dto.lat, dto.lng, dto.accuracyM);

    const attempt = await this.prisma.visitAttempt.create({
      data: {
        userId,
        poiId: dto.poiId,
        reportedLat: dto.lat,
        reportedLng: dto.lng,
        accuracyMeters: dto.accuracyM,
        distanceMeters,
        dwellSeconds: 0,
        lastHeartbeatAt: withinGeofence ? new Date() : null,
        status: 'pending',
      },
    });

    return {
      attemptId: attempt.id,
      distanceMeters,
      withinGeofence,
      lowAccuracyWarning: lowAccuracy,
      requiredDwellSeconds: REQUIRED_DWELL_SECONDS,
      requiredProof: poi.requiresProof ? 'photo' : 'none',
      geofenceRadiusM: effectiveRadius,
    };
  }

  /** FR-EXP-01/07: периодическое подтверждение нахождения в геозоне (dwell-time). */
  async heartbeat(userId: string, attemptId: string, dto: HeartbeatDto) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    const poi = await this.prisma.poi.findUniqueOrThrow({ where: { id: attempt.poiId }, include: { category: true } });

    const player = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glovesLevel: true } });
    const gloves = await getUpgradeSettings(this.prisma, 'gloves');
    const effectiveRadius = poi.geofenceRadiusM + (gloves[player.glovesLevel]?.effectValue ?? 0);
    const { distanceMeters, withinGeofence } = this.anticheat.checkGeofence(
      dto.lat,
      dto.lng,
      poi.lat,
      poi.lng,
      effectiveRadius,
      dto.accuracyM,
    );

    await this.anticheat.recordGeoLog(userId, dto.lat, dto.lng, dto.accuracyM);

    if (!withinGeofence) {
      // Игрок покинул геозону — таймер сбрасывается (допуск на один пропуск реализован
      // на уровне клиента: клиент не шлёт heartbeat при кратковременной потере GPS)
      const updated = await this.prisma.visitAttempt.update({
        where: { id: attemptId },
        data: { dwellSeconds: 0, lastHeartbeatAt: null, distanceMeters },
      });
      return { dwellSeconds: updated.dwellSeconds, withinGeofence, reset: true };
    }

    const now = new Date();
    const elapsedSinceLastBeat = attempt.lastHeartbeatAt
      ? (now.getTime() - attempt.lastHeartbeatAt.getTime()) / 1000
      : 0;

    // Допуск на один пропущенный heartbeat (~до 90 сек без разрыва) — иначе сброс
    const increment = elapsedSinceLastBeat > 0 && elapsedSinceLastBeat < 90 ? elapsedSinceLastBeat : 20;

    const updated = await this.prisma.visitAttempt.update({
      where: { id: attemptId },
      data: {
        dwellSeconds: { increment: Math.round(increment) },
        lastHeartbeatAt: now,
        distanceMeters,
      },
    });

    return {
      dwellSeconds: updated.dwellSeconds,
      withinGeofence: true,
      dwellComplete: updated.dwellSeconds >= REQUIRED_DWELL_SECONDS,
    };
  }

  /** FR-EXP-03: загрузка фото/QR-подтверждения для ценных точек. */
  async submitProof(userId: string, attemptId: string, dto: ProofDto) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    await this.prisma.visitAttempt.update({
      where: { id: attempt.id },
      data: { proofType: dto.proofType, proofAssetUrl: dto.assetUrl },
    });
    return { success: true };
  }

  /** FR-EXP-02/04/06: финализация — расчёт анти-чит скора и начисление наград. */
  async complete(userId: string, attemptId: string) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    const poi = await this.prisma.poi.findUniqueOrThrow({ where: { id: attempt.poiId }, include: { category: true } });

    if (attempt.dwellSeconds < REQUIRED_DWELL_SECONDS) {
      throw new BadRequestException({
        code: 'DWELL_TIME_INCOMPLETE',
        message: `Нужно находиться в зоне ещё ${REQUIRED_DWELL_SECONDS - attempt.dwellSeconds} сек.`,
      });
    }

    // Фото/QR-подтверждение временно отключено (реализуем позже вместе с загрузкой фото
    // на фронтенде) — сейчас для завершения посещения достаточно дойти и нажать «Исследовать».
    // if (poi.requiresProof && attempt.proofType === 'none') {
    //   throw new BadRequestException({
    //     code: 'PROOF_REQUIRED',
    //     message: 'Для этой точки требуется фото или QR-подтверждение',
    //   });
    // }

    const speedSignal = await this.anticheat.checkSpeedAnomaly(userId, attempt.reportedLat, attempt.reportedLng);
    const accountSignal = await this.anticheat.checkAccountHistory(userId);
    const player = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glovesLevel: true } });
    const gloves = await getUpgradeSettings(this.prisma, 'gloves');
    const effectiveRadius = poi.geofenceRadiusM + (gloves[player.glovesLevel]?.effectValue ?? 0);
    const geofenceSignal = attempt.distanceMeters && attempt.distanceMeters > effectiveRadius ? 100 : 0;
    const dwellSignal = attempt.dwellSeconds < REQUIRED_DWELL_SECONDS ? 100 : 0;

    const score = this.anticheat.computeScore({
      geofenceViolation: geofenceSignal,
      dwellAnomaly: dwellSignal,
      speedImpossibility: speedSignal,
      accountHistory: accountSignal,
    });

    const resolution = this.anticheat.resolveStatus(score);

    await this.prisma.visitAttempt.update({
      where: { id: attempt.id },
      data: { anticheatScore: score, status: resolution },
    });

    if (resolution === 'rejected') {
      throw new ForbiddenException({
        code: 'VISIT_REJECTED_ANTICHEAT',
        message: 'Посещение не подтверждено системой защиты от накрутки',
      });
    }

    if (resolution === 'flagged_for_review') {
      // Награда отложена до ручной проверки модератором (SRS п.12.2)
      return {
        status: 'flagged_for_review',
        message: 'Ваше посещение отправлено на дополнительную проверку. Награда будет начислена после подтверждения.',
      };
    }

    // resolution === 'verified' → начисляем награду идемпотентно
    const isSecret = poi.visibility === 'secret';
    const ownedBonuses = await this.prisma.inventoryItem.findMany({ where: { userId, shopItem: { name: { in: ['Фонарь путешественника', 'Палатка уральская'] } } }, select: { shopItem: { select: { name: true } } } });
    const hasFlashlight = ownedBonuses.some(({ shopItem }) => shopItem.name === 'Фонарь путешественника');
    const hasTent = ownedBonuses.some(({ shopItem }) => shopItem.name === 'Палатка уральская');
    const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Yekaterinburg', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    const nightBonus = hasFlashlight && localHour >= 0 && localHour < 4 ? 0.1 : 0;
    const natureBonus = hasTent && ['lake', 'mountain', 'river', 'spring', 'cave', 'rare', 'park', 'waterfall', 'trail'].includes(poi.category?.code ?? '') ? 0.05 : 0;
    const xpAwarded = Math.round((isSecret ? 5000 : poi.baseXp) * (1 + nightBonus));
    const secretCoinsAwarded = isSecret ? Math.round(10000 * (1 + nightBonus)) : 0;
    const coinsAwarded = isSecret ? 0 : Math.round(poi.baseCoins * (1 + nightBonus + natureBonus));
    const crystalsAwarded = poi.visibility === 'secret' ? 0 : poi.baseCrystals;

    const activeEvent = await this.prisma.expeditionEvent.findFirst({ where: { startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, orderBy: { startsAt: 'desc' } });
    const visitResult = await this.prisma.$transaction(async (tx) => {
      if (isSecret) {
        const discovery = await tx.poi.updateMany({ where: { id: poi.id, visibility: 'secret', secretFoundAt: null }, data: { secretFoundBy: userId, secretFoundAt: new Date(), visibility: 'public' } });
        if (discovery.count !== 1) throw new BadRequestException({ code: 'SECRET_ALREADY_FOUND', message: 'Эту секретную точку уже нашёл другой путешественник.' });
      }
      const created = await tx.visit.create({
        data: {
          userId,
          poiId: poi.id,
          visitAttemptId: attempt.id,
          xpAwarded,
          coinsAwarded,
          crystalsAwarded,
        },
      });
      await tx.poi.update({ where: { id: poi.id }, data: { visitCount: { increment: 1 } } });
      if (poi.title === 'Открыть Челябинскую область') {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { privacySettings: true } });
        const settings = user.privacySettings && typeof user.privacySettings === 'object' && !Array.isArray(user.privacySettings) ? user.privacySettings as Record<string, unknown> : {};
        if (settings.tutorialRequired === true) {
          await tx.user.update({ where: { id: userId }, data: { privacySettings: { ...settings, tutorialPointFound: true } as Prisma.InputJsonValue } });
        }
      }
      await tx.poiFlag.deleteMany({ where: { poiId: poi.id, userId: { not: userId } } });
      if (activeEvent) {
        const expeditionIds = activeEvent.poiIds as string[];
        const currentStage = await tx.expeditionProgress.upsert({
          where: { eventId_userId: { eventId: activeEvent.id, userId } },
          update: {}, create: { eventId: activeEvent.id, userId, stageIndex: 0 },
          select: { stageIndex: true },
        });
        if (expeditionIds[currentStage.stageIndex] === poi.id) {
          await tx.expeditionProgress.updateMany({
            where: { eventId: activeEvent.id, userId, stageIndex: currentStage.stageIndex },
            data: { stageIndex: { increment: 1 } },
          });
        }
      }
      if (isSecret) {
        const wallet = await tx.wallet.update({ where: { userId }, data: { coinsBalance: { increment: secretCoinsAwarded } } });
        await tx.transaction.create({ data: { walletId: wallet.id, type: 'earn', source: 'secret_discovery', amount: secretCoinsAwarded, currency: 'coins', metadata: { poiId: poi.id, flashlightBonus: nightBonus > 0 } } });
      }
      if (crystalsAwarded > 0) {
        const wallet = await tx.wallet.update({ where: { userId }, data: { crystalsBalance: { increment: crystalsAwarded } } });
        await tx.transaction.create({ data: { walletId: wallet.id, type: 'earn', source: 'visit', amount: crystalsAwarded, currency: 'crystals', metadata: { poiId: poi.id } } });
      }
      return { visit: created, secretDiscovered: isSecret };
    });

    let progress = await this.progression.addXp(userId, xpAwarded);
    if (coinsAwarded > 0) await this.economy.earnCoins(userId, coinsAwarded, 'visit', { poiId: poi.id });

    const roulette = await this.prisma.rouletteChallenge.findFirst({ where: { userId, poiId: poi.id, status: 'active', expiresAt: { gt: new Date() } } });
    let rouletteReward = 0;
    if (roulette) {
      rouletteReward = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.rouletteChallenge.updateMany({ where: { id: roulette.id, status: 'active', expiresAt: { gt: new Date() } }, data: { status: 'completed', completedAt: new Date() } });
        if (!claimed.count) return 0;
        const prize = 5;
        const wallet = await tx.wallet.update({ where: { userId }, data: { coinsBalance: { increment: prize } } });
        await tx.transaction.create({ data: { walletId: wallet.id, type: 'earn', source: 'traveler_roulette_win', amount: prize, currency: 'coins', metadata: { challengeId: roulette.id } } });
        return prize;
      });
      if (rouletteReward > 0) {
        await this.prisma.visit.update({ where: { id: visitResult.visit.id }, data: { xpAwarded: { increment: 5 }, coinsAwarded: { increment: 5 } } });
        progress = await this.progression.addXp(userId, 5);
      }
    }

    // Проверка вех «посетить N мест» — начисляется поверх обычной награды за точку
    const totalVisits = await this.prisma.visit.count({ where: { userId } });
    const newMilestones = await this.progression.checkVisitMilestones(userId, totalVisits);

    return {
      status: 'verified',
      visit: visitResult.visit,
      xpAwarded: xpAwarded + (rouletteReward > 0 ? 5 : 0),
      coinsAwarded: coinsAwarded + (visitResult.secretDiscovered ? secretCoinsAwarded : 0) + rouletteReward,
      crystalsAwarded,
      secretDiscovery: visitResult.secretDiscovered ? { xp: xpAwarded, coins: secretCoinsAwarded } : undefined,
      rouletteReward,
      level: progress.level,
      newMilestones,
    };
  }

  async history(userId: string) {
    return this.prisma.visit.findMany({
      where: { userId },
      include: { poi: { include: { category: true } } },
      orderBy: { visitedAt: 'desc' },
    });
  }

  /**
   * Туристический паспорт: посещённые места, отсортированные по сложности
   * (сначала сложные, потом легче), с личными заметками игрока.
   */
  async passport(userId: string) {
    const visits = await this.prisma.visit.findMany({
      where: { userId },
      include: { poi: { include: { category: true } } },
    });

    const difficultyOrder: Record<string, number> = { hard: 0, medium: 1, easy: 2 };
    return visits.sort((a, b) => {
      const diff = (difficultyOrder[a.poi.difficulty] ?? 3) - (difficultyOrder[b.poi.difficulty] ?? 3);
      if (diff !== 0) return diff;
      return b.visitedAt.getTime() - a.visitedAt.getTime();
    });
  }

  /** Личная заметка о посещённом месте, до 50 символов (валидация в DTO контроллера). */
  async updateNote(userId: string, visitId: string, note: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId !== userId) {
      throw new NotFoundException({ code: 'VISIT_NOT_FOUND', message: 'Посещение не найдено' });
    }
    return this.prisma.visit.update({ where: { id: visitId }, data: { note } });
  }

  private async getOwnedAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.visitAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND', message: 'Попытка посещения не найдена' });
    }
    return attempt;
  }
}
