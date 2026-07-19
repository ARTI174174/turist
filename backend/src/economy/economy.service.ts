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

    const wallet = await this.getWallet(userId);

    // Способность "Опытный турист" и вся игровая прогрессия покупается ТОЛЬКО за монеты (FR-ECO-04)
    const currency: 'coins' | 'crystals' = item.priceCoins != null ? 'coins' : 'crystals';
    const price = currency === 'coins' ? item.priceCoins! : item.priceCrystals!;
    const balance = currency === 'coins' ? wallet.coinsBalance : wallet.crystalsBalance;

    if (balance < price) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_FUNDS',
        message: 'Недостаточно средств для покупки',
      });
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data:
          currency === 'coins'
            ? { coinsBalance: { decrement: price } }
            : { crystalsBalance: { decrement: price } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'spend',
          source: 'shop',
          amount: price,
          currency,
          metadata: { shopItemId },
        },
      }),
      this.prisma.inventoryItem.create({
        data: { userId, shopItemId },
      }),
    ]);

    return { success: true, itemId: item.id };
  }

  async getInventory(userId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { shopItem: true },
    });
  }
}
