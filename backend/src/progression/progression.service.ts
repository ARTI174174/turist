import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Кривая уровней согласно SRS, раздел 6.2 (референсные значения, настраиваются)
export const RANKS = [
  { code: 'novice', title: 'Новичок', minXp: 0 },
  { code: 'traveler', title: 'Путешественник', minXp: 1000 },
  { code: 'explorer', title: 'Исследователь', minXp: 5000 },
  { code: 'pathfinder', title: 'Следопыт', minXp: 15000 },
  { code: 'expert', title: 'Эксперт', minXp: 40000 },
  { code: 'legend', title: 'Легенда Урала', minXp: 100000 },
] as const;

export function resolveRank(xp: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  async addXp(userId: string, amount: number) {
    const progress = await this.prisma.userProgress.upsert({
      where: { userId },
      update: { xp: { increment: amount } },
      create: { userId, xp: amount },
    });

    const newRank = resolveRank(progress.xp);
    if (newRank.code !== progress.rankCode) {
      await this.prisma.userProgress.update({
        where: { userId },
        data: { rankCode: newRank.code },
      });
    }

    return { xp: progress.xp, rank: newRank };
  }

  async getProgress(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId } });
    const xp = progress?.xp ?? 0;
    const rank = resolveRank(xp);
    const currentIndex = RANKS.findIndex((r) => r.code === rank.code);
    const nextRank = RANKS[currentIndex + 1] ?? null;

    return {
      xp,
      rank,
      nextRank,
      xpToNextRank: nextRank ? nextRank.minXp - xp : null,
      hasSecretAccess: xp >= 10000, // способность «Опытный турист»
    };
  }
}
