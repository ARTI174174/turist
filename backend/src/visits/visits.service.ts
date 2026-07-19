import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnticheatService } from './anticheat.service';
import { ProgressionService } from '../progression/progression.service';
import { EconomyService } from '../economy/economy.service';
import { StartAttemptDto, HeartbeatDto, ProofDto } from './dto/attempt.dto';

const REQUIRED_DWELL_SECONDS = 120;

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
    const poi = await this.prisma.poi.findUnique({ where: { id: dto.poiId } });
    if (!poi) throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });

    const alreadyVisited = await this.prisma.visit.findUnique({
      where: { userId_poiId: { userId, poiId: dto.poiId } },
    });
    if (alreadyVisited) {
      throw new BadRequestException({ code: 'ALREADY_VISITED', message: 'Точка уже открыта' });
    }

    const { distanceMeters, withinGeofence, lowAccuracy } = this.anticheat.checkGeofence(
      dto.lat,
      dto.lng,
      poi.lat,
      poi.lng,
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
    };
  }

  /** FR-EXP-01/07: периодическое подтверждение нахождения в геозоне (dwell-time). */
  async heartbeat(userId: string, attemptId: string, dto: HeartbeatDto) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    const poi = await this.prisma.poi.findUniqueOrThrow({ where: { id: attempt.poiId } });

    const { distanceMeters, withinGeofence } = this.anticheat.checkGeofence(
      dto.lat,
      dto.lng,
      poi.lat,
      poi.lng,
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
    const poi = await this.prisma.poi.findUniqueOrThrow({ where: { id: attempt.poiId } });

    if (attempt.dwellSeconds < REQUIRED_DWELL_SECONDS) {
      throw new BadRequestException({
        code: 'DWELL_TIME_INCOMPLETE',
        message: `Нужно находиться в зоне ещё ${REQUIRED_DWELL_SECONDS - attempt.dwellSeconds} сек.`,
      });
    }

    if (poi.requiresProof && attempt.proofType === 'none') {
      throw new BadRequestException({
        code: 'PROOF_REQUIRED',
        message: 'Для этой точки требуется фото или QR-подтверждение',
      });
    }

    const speedSignal = await this.anticheat.checkSpeedAnomaly(userId, attempt.reportedLat, attempt.reportedLng);
    const accountSignal = await this.anticheat.checkAccountHistory(userId);
    const geofenceSignal = attempt.distanceMeters && attempt.distanceMeters > 30 ? 100 : 0;
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
    const xpAwarded = poi.baseXp;
    const coinsAwarded = poi.baseCoins;

    const visit = await this.prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          userId,
          poiId: poi.id,
          visitAttemptId: attempt.id,
          xpAwarded,
          coinsAwarded,
        },
      });
      await tx.poi.update({ where: { id: poi.id }, data: { visitCount: { increment: 1 } } });
      return created;
    });

    const progress = await this.progression.addXp(userId, xpAwarded);
    await this.economy.earnCoins(userId, coinsAwarded, 'visit', { poiId: poi.id });

    return {
      status: 'verified',
      visit,
      xpAwarded,
      coinsAwarded,
      rank: progress.rank,
    };
  }

  async history(userId: string) {
    return this.prisma.visit.findMany({
      where: { userId },
      include: { poi: { include: { category: true } } },
      orderBy: { visitedAt: 'desc' },
    });
  }

  private async getOwnedAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.visitAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND', message: 'Попытка посещения не найдена' });
    }
    return attempt;
  }
}
