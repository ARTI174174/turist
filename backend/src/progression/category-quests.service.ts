import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CATEGORY_QUESTS, countQuestVisits } from './category-quests';

@Injectable()
export class CategoryQuestsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const [visits, claims] = await Promise.all([
      this.prisma.visit.findMany({ where: { userId, poi: { title: { not: 'Открыть Челябинскую область' } } }, select: { poi: { select: { category: { select: { code: true } } } } } }),
      this.prisma.userQuestProgress.findMany({ where: { userId, completedAt: { not: null }, quest: { code: { in: CATEGORY_QUESTS.map((q) => q.code) } } }, select: { quest: { select: { code: true } } } }),
    ]);
    const completed = new Set(claims.map((claim) => claim.quest.code));
    const codes = visits.map((visit) => visit.poi.category.code);
    return CATEGORY_QUESTS.map((quest) => ({ ...quest, progress: Math.min(quest.target, countQuestVisits(quest.categories, codes)), claimed: completed.has(quest.code) }));
  }

  async claim(userId: string, code: string) {
    const definition = CATEGORY_QUESTS.find((quest) => quest.code === code);
    if (!definition) throw new NotFoundException('Задание не найдено.');
    return this.prisma.$transaction(async (tx) => {
      const visited = await tx.visit.count({ where: { userId, poi: { title: { not: 'Открыть Челябинскую область' }, ...(definition.categories.length ? { category: { code: { in: [...definition.categories] } } } : {}) } } });
      if (visited < definition.target) throw new BadRequestException('Сначала исследуйте нужное количество мест.');
      const quest = await tx.quest.upsert({
        where: { code }, update: {},
        create: { code, title: definition.title, type: 'permanent', condition: { target: definition.target, categories: [...definition.categories] }, reward: { coins: definition.coins, crystals: definition.crystals }, activeFrom: new Date('2020-01-01'), activeTo: new Date('2100-01-01') },
      });
      await tx.userQuestProgress.upsert({ where: { userId_questId: { userId, questId: quest.id } }, update: {}, create: { userId, questId: quest.id } });
      const claimed = await tx.userQuestProgress.updateMany({ where: { userId, questId: quest.id, completedAt: null }, data: { completedAt: new Date(), progress: definition.target } });
      if (claimed.count !== 1) throw new BadRequestException('Награда за это задание уже получена.');
      const wallet = await tx.wallet.update({ where: { userId }, data: { coinsBalance: { increment: definition.coins }, crystalsBalance: { increment: definition.crystals } } });
      await tx.transaction.createMany({ data: [
        { walletId: wallet.id, type: 'earn', source: 'category_quest', amount: definition.coins, currency: 'coins', metadata: { questCode: code } },
        { walletId: wallet.id, type: 'earn', source: 'category_quest', amount: definition.crystals, currency: 'crystals', metadata: { questCode: code } },
      ] });
      return { title: definition.title, coins: definition.coins, crystals: definition.crystals, wallet: { coinsBalance: wallet.coinsBalance, crystalsBalance: wallet.crystalsBalance } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
