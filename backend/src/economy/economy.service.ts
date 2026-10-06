import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EconomyService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, coinsBalance: 0, crystalsBalance: 0 },
    });
  }

  async getTransactions(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Начисление монет — источник только игровые события (FR-ECO-01), не донат. */
  async earnCoins(userId: string, amount: number, source: string, metadata: Record<string, any> = {}) {
    const wallet = await this.getWallet(userId);
    const updated = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { coinsBalance: { increment: amount } },
    });
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'earn',
        source,
        amount,
        currency: 'coins',
        metadata,
      },
    });
    return updated;
  }

  async listShopItems(category?: string) {
    return this.prisma.shopItem.findMany({
      where: { active: true, ...(category ? { category } : {}) },
    });
  }

  async purchase(userId: string, shopItemId: string) {
    const item = await this.prisma.shopItem.findUnique({ where: { id: shopItemId } });
    if (!item || !item.active) {
      throw new NotFoundException({ code: 'ITEM_NOT_FOUND', message: 'Предмет не найден' });
    }

    // Способность "Опытный турист" и вся игровая прогрессия покупается ТОЛЬКО за монеты (FR-ECO-04)
    const currency: 'coins' | 'crystals' = item.priceCoins != null ? 'coins' : 'crystals';
    const price = currency === 'coins' ? item.priceCoins! : item.priceCrystals!;
    if (!Number.isSafeInteger(price) || price < 0) throw new BadRequestException('У товара некорректно задана цена.');
    if (currency === 'crystals' && item.priceCrystals == null) throw new BadRequestException('У товара не задана цена.');

    const permanentEquipment = new Set(['Магнит следопыта', 'Фонарь путешественника', 'Компас искателя', 'Палатка уральская', 'Флаг путешественника']);
    await this.prisma.$transaction(async (tx) => {
      if (permanentEquipment.has(item.name)) {
        const alreadyOwned = await tx.inventoryItem.findFirst({ where: { userId, shopItemId }, select: { id: true } });
        if (alreadyOwned) throw new BadRequestException('Этот предмет уже есть в вашем лагере или снаряжении.');
      }

      const charged = await tx.wallet.updateMany({
        where: { userId, ...(currency === 'coins' ? { coinsBalance: { gte: price } } : { crystalsBalance: { gte: price } }) },
        data: currency === 'coins' ? { coinsBalance: { decrement: price } } : { crystalsBalance: { decrement: price } },
      });
      if (charged.count !== 1) throw new BadRequestException({ code: 'INSUFFICIENT_FUNDS', message: 'Недостаточно средств для покупки' });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'spend',
          source: 'shop',
          amount: price,
          currency,
          metadata: { shopItemId },
        },
      });
      await tx.inventoryItem.create({
        data: { userId, shopItemId },
      });
    }, { isolationLevel: 'Serializable' });

    return { success: true, itemId: item.id };
  }

  async getInventory(userId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { shopItem: true },
    });
  }
}
