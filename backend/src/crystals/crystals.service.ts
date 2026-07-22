import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { haversineDistanceMeters } from '../common/geo/geo.util';

const VISIBILITY_RADIUS_M = 1000; // виден на карте только ближе 1 км
const PICKUP_RADIUS_M = 50; // забрать можно, только когда реально рядом

@Injectable()
export class CrystalsService {
  constructor(private prisma: PrismaService) {}

  /** Кристаллы в радиусе видимости от игрока, которые он ещё не подобрал. */
  async findNearby(userId: string, lat: number, lng: number) {
    const pickedIds = (
      await this.prisma.crystalPickup.findMany({ where: { userId }, select: { crystalId: true } })
    ).map((p) => p.crystalId);

    const all = await this.prisma.crystal.findMany({
      where: pickedIds.length > 0 ? { id: { notIn: pickedIds } } : undefined,
    });

    return all
      .map((c) => ({ ...c, distanceMeters: haversineDistanceMeters(lat, lng, c.lat, c.lng) }))
      .filter((c) => c.distanceMeters <= VISIBILITY_RADIUS_M)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async collect(userId: string, crystalId: string, lat: number, lng: number) {
    const crystal = await this.prisma.crystal.findUnique({ where: { id: crystalId } });
    if (!crystal) {
      throw new NotFoundException({ code: 'CRYSTAL_NOT_FOUND', message: 'Кристалл не найден' });
    }

    const distance = haversineDistanceMeters(lat, lng, crystal.lat, crystal.lng);
    if (distance > PICKUP_RADIUS_M) {
      throw new BadRequestException({
        code: 'TOO_FAR',
        message: `Подойдите ближе, чтобы забрать кристалл (осталось ${Math.round(distance - PICKUP_RADIUS_M)} м)`,
      });
    }

    const already = await this.prisma.crystalPickup.findUnique({
      where: { userId_crystalId: { userId, crystalId } },
    });
    if (already) {
      throw new BadRequestException({ code: 'ALREADY_PICKED', message: 'Этот кристалл уже собран' });
    }

    await this.prisma.$transaction([
      this.prisma.crystalPickup.create({ data: { userId, crystalId } }),
      this.prisma.wallet.update({
        where: { userId },
        data: { crystalsBalance: { increment: crystal.reward } },
      }),
      this.prisma.transaction.create({
        data: {
          wallet: { connect: { userId } },
          type: 'earn',
          source: 'crystal_pickup',
          amount: crystal.reward,
          currency: 'crystals',
          metadata: { crystalId },
        },
      }),
    ]);

    return { success: true, reward: crystal.reward };
  }
}
