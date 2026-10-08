import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
// crystalReward — по порядковому номеру вехи в списке (1-я даёт 1 кристалл,
// 2-я — 2, и т.д.), как попросил заказчик.
// ============================================================
export const VISIT_MILESTONES = [
  { count: 1, reward: 10, crystalReward: 1 },
  { count: 5, reward: 500, crystalReward: 2 },
  { count: 10, reward: 1000, crystalReward: 3 },
  { count: 50, reward: 5000, crystalReward: 4 },
  { count: 100, reward: 10000, crystalReward: 5 },
  { count: 200, reward: 20000, crystalReward: 6 },
  { count: 500, reward: 50000, crystalReward: 7 },
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

  /** Возвращает открывшиеся вехи. Награду игрок забирает отдельно в задании. */
  async checkVisitMilestones(userId: string, totalVisits: number) {
    const progress = await this.prisma.userProgress.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const claimed = new Set(progress.visitMilestonesClaimed);
    return VISIT_MILESTONES.filter((milestone) => totalVisits >= milestone.count && totalVisits - 1 < milestone.count && !claimed.has(milestone.count));
  }

  async claimVisitMilestone(userId: string, count: number) {
    const milestone = VISIT_MILESTONES.find((item) => item.count === count);
    if (!milestone) throw new BadRequestException('Такого задания нет.');
    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.userProgress.upsert({ where: { userId }, update: {}, create: { userId } });
      const visits = await tx.visit.count({ where: { userId } });
      if (visits < milestone.count) throw new BadRequestException('Сначала исследуйте нужное количество мест.');
      if (progress.visitMilestonesClaimed.includes(milestone.count)) throw new BadRequestException('Награда уже получена.');
      const updatedProgress = await tx.userProgress.update({
        where: { userId },
        data: { xp: { increment: milestone.reward }, visitMilestonesClaimed: { push: milestone.count } },
        select: { xp: true },
      });
      const wallet = await tx.wallet.upsert({
        where: { userId }, update: { crystalsBalance: { increment: milestone.crystalReward } },
        create: { userId, crystalsBalance: milestone.crystalReward },
      });
      if (milestone.crystalReward > 0) await tx.transaction.create({ data: { walletId: wallet.id, type: 'earn', source: 'visit_milestone', amount: milestone.crystalReward, currency: 'crystals', metadata: { count: milestone.count } } });
      return { count: milestone.count, xp: updatedProgress.xp, reward: milestone.reward, crystalReward: milestone.crystalReward, wallet: { crystalsBalance: wallet.crystalsBalance } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async getVisitMilestonesStatus(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    const claimed = new Set(progress?.visitMilestonesClaimed ?? []);
    const totalVisits = await this.prisma.visit.count({ where: { userId } });

    return VISIT_MILESTONES.map((m) => ({
      count: m.count,
      reward: m.reward,
      crystalReward: m.crystalReward,
      achieved: totalVisits >= m.count,
      claimed: claimed.has(m.count),
      progress: Math.min(totalVisits, m.count),
    }));
  }
}
