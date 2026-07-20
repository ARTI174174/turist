import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { haversineDistanceMeters, speedKmh } from '../common/geo/geo.util';

const REQUIRED_DWELL_SECONDS = 120;
const MAX_ACCURACY_M = 50;

export interface AnticheatSignals {
  geofenceViolation: number;
  dwellAnomaly: number;
  speedImpossibility: number;
  accountHistory: number;
  score: number;
}

@Injectable()
export class AnticheatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Уровень 1: проверка геозоны и точности сигнала.
   * Радиус берётся из точки (poi.geofenceRadiusM) — для крупных объектов
   * (озёра, водохранилища) он может быть 1000-3000 м, чтобы хватало с берега.
   */
  checkGeofence(
    userLat: number,
    userLng: number,
    poiLat: number,
    poiLng: number,
    radiusM: number,
    accuracyM?: number,
  ) {
    const distanceMeters = haversineDistanceMeters(userLat, userLng, poiLat, poiLng);
    const withinGeofence = distanceMeters <= radiusM;
    const lowAccuracy = (accuracyM ?? 0) > MAX_ACCURACY_M;
    return { distanceMeters, withinGeofence, lowAccuracy };
  }

  /**
   * Уровень 3: анализ скорости перемещения по последним geo_logs пользователя —
   * защита от "телепортации" между физически удалёнными точками (SRS п.12.1, уровень 3).
   */
  async checkSpeedAnomaly(userId: string, lat: number, lng: number): Promise<number> {
    const lastLog = await this.prisma.geoLog.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!lastLog) return 0;

    const seconds = (Date.now() - lastLog.recordedAt.getTime()) / 1000;
    if (seconds <= 0) return 0;

    const speed = speedKmh(lastLog.lat, lastLog.lng, lat, lng, seconds);
    const maxSpeed = Number(process.env.ANTICHEAT_MAX_SPEED_KMH ?? 180);

    if (speed > maxSpeed) {
      // Чем сильнее превышение физически правдоподобной скорости — тем выше сигнал (0-100)
      return Math.min(100, ((speed - maxSpeed) / maxSpeed) * 100);
    }
    return 0;
  }

  /** Уровень 6: базовый скоринг по истории аккаунта (новый аккаунт = выше риск). */
  async checkAccountHistory(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 100;

    const accountAgeHours = (Date.now() - user.createdAt.getTime()) / 1000 / 3600;
    const visitCount = await this.prisma.visit.count({ where: { userId } });

    // Новый аккаунт (<1 часа) с уже большим числом визитов — подозрительно
    if (accountAgeHours < 1 && visitCount > 5) return 70;
    if (accountAgeHours < 24 && visitCount > 30) return 40;
    return 0;
  }

  async recordGeoLog(userId: string, lat: number, lng: number, accuracyM?: number) {
    await this.prisma.geoLog.create({
      data: { userId, lat, lng, accuracyMeters: accuracyM },
    });
  }

  /** Итоговый скор 0-100, см. SRS Приложение Г. */
  computeScore(signals: Omit<AnticheatSignals, 'score'>): number {
    const w = { geofence: 0.3, dwell: 0.2, speed: 0.3, account: 0.2 };
    const score =
      w.geofence * signals.geofenceViolation +
      w.dwell * signals.dwellAnomaly +
      w.speed * signals.speedImpossibility +
      w.account * signals.accountHistory;
    return Math.min(100, Math.round(score));
  }

  resolveStatus(score: number): 'verified' | 'flagged_for_review' | 'rejected' {
    const reviewThreshold = Number(process.env.ANTICHEAT_SCORE_REVIEW_THRESHOLD ?? 61);
    const rejectThreshold = Number(process.env.ANTICHEAT_SCORE_REJECT_THRESHOLD ?? 86);
    if (score >= rejectThreshold) return 'rejected';
    if (score >= reviewThreshold) return 'flagged_for_review';
    return 'verified';
  }
}
