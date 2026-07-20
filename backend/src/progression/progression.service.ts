import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// ============================================================
// Система уровней аккаунта (баллы = XP, начисляются за посещения)
// Уровень 0 — новый игрок (0 баллов).
// 1: 10 · 2: 50 · 3: 100 · дальше удвоение: 4: 200 · 5: 400 · 6: 800 ·
// 7: 1600 · 8: 3200 · и т.д.
// ============================================================
export function levelThreshold(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return 10;
  if (level === 2) return 50;
  if (level === 3) return 100;
  return 100 * 2 ** (level - 3);
}

export function resolveLevel(xp: number): { level: number; currentThreshold: number; nextThreshold: number | null } {
  let level = 0;
  // Безопасный верхний предел, чтобы не уйти в бесконечный цикл при огромных xp
  while (levelThreshold(level + 1) <= xp && level < 200) {
    level++;
  }
  return {
    level,
    currentThreshold: levelThreshold(level),
    nextThreshold: level < 200 ? levelThreshold(level + 1) : null,
  };
}

/** Цвет обводки аватара по уровню (используется в будущем экране «Друзья»). */
export function levelBorderColor(level: number): string {
  if (level <= 0) return '#4CAF50'; // зелёная — 0 уровень
  if (level <= 4) return '#2196F3'; // синяя — 1-4
  if (level <= 9) return '#FBC02D'; // жёлтая — 5-9
  if (level <= 19) return '#E53935'; // красная — 10-19
  return '#9C27B0'; // фиолетовая — 20+
}

// ============================================================
// Вехи по количеству посещённых мест (SRS: экран «Задания»)
// ============================================================
export const VISIT_MILESTONES = [
  { count: 1, reward: 10 },
  { count: 5, reward: 500 },
  { count: 10, reward: 1000 },
  { count: 50, reward: 5000 },
  { count: 100, reward: 10000 },
  { count: 200, reward: 20000 },
  { count: 500, reward: 50000 },
] as const;

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  async addXp(userId: string, amount: number) {
    const progress = await this.prisma.userProgress.upsert({
      where: { userId },
      update: { xp: { increment: amount } },
      create: { userId, xp: amount },
    });

    const { level } = resolveLevel(progress.xp);
    return { xp: progress.xp, level };
  }

  async getProgress(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    const xp = progress?.xp ?? 0;
    const { level, currentThreshold, nextThreshold } = resolveLevel(xp);

    return {
      xp,
      level,
      xpForCurrentLevel: currentThreshold,
      xpForNextLevel: nextThreshold,
      xpToNextLevel: nextThreshold !== null ? nextThreshold - xp : null,
      hasSecretAccess: xp >= 10000, // способность «Опытный турист»
    };
  }

  /**
   * Проверяет, пересёк ли игрок новую веху по количеству посещённых мест,
   * и если да — начисляет разовую награду и запоминает, что она уже выдана
   * (SRS: экран «Задания», список «Посетить N мест»).
   */
  async checkVisitMilestones(userId: string, totalVisits: number) {
    const progress = await this.prisma.userProgress.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const claimed = new Set(progress.visitMilestonesClaimed);
    const newlyClaimed: { count: number; reward: number }[] = [];

    for (const milestone of VISIT_MILESTONES) {
      if (totalVisits >= milestone.count && !claimed.has(milestone.count)) {
        claimed.add(milestone.count);
        newlyClaimed.push(milestone);
      }
    }

    if (newlyClaimed.length > 0) {
      const totalReward = newlyClaimed.reduce((sum, m) => sum + m.reward, 0);
      await this.prisma.userProgress.update({
        where: { userId },
        data: {
          xp: { increment: totalReward },
          visitMilestonesClaimed: Array.from(claimed),
        },
      });
    }

    return newlyClaimed;
  }

  async getVisitMilestonesStatus(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    const claimed = new Set(progress?.visitMilestonesClaimed ?? []);
    const totalVisits = await this.prisma.visit.count({ where: { userId } });

    return VISIT_MILESTONES.map((m) => ({
      count: m.count,
      reward: m.reward,
      achieved: totalVisits >= m.count,
      claimed: claimed.has(m.count),
      progress: Math.min(totalVisits, m.count),
    }));
  }
}
