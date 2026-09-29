import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { haversineDistanceMeters } from '../common/geo/geo.util';
import { chunkRangeAround, randomPointInChunk } from '../common/geo/chunk.util';

const PICKUP_RADIUS_M = 50;
const RESPAWN_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CrystalsService {
  constructor(private prisma: PrismaService) {}

  async findNearby(userId: string, lat: number, lng: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glassesLevel: true } });
    const visibilityRadiusM = [500, 1000, 2000, 5000, 10000][user.glassesLevel] ?? 500;
    const { minChunkX, maxChunkX, minChunkY, maxChunkY } = chunkRangeAround(
      lat,
      lng,
      visibilityRadiusM,
    );
    const chunks: { chunkX: number; chunkY: number; lat: number; lng: number; reward: number }[] = [];
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
        const point = randomPointInChunk(chunkX, chunkY);
        chunks.push({ chunkX, chunkY, ...point, reward: 1 });
      }
    }
    await this.prisma.crystal.createMany({ data: chunks, skipDuplicates: true });
    let crystals = await this.prisma.crystal.findMany({
      where: { chunkX: { gte: minChunkX, lte: maxChunkX }, chunkY: { gte: minChunkY, lte: maxChunkY } },
    });
    const stalePicked = crystals.filter((crystal) => crystal.pickedAt && Date.now() - crystal.pickedAt.getTime() > RESPAWN_AFTER_MS);
    if (stalePicked.length) {
      for (const crystal of stalePicked) {
        const point = randomPointInChunk(crystal.chunkX, crystal.chunkY);
        await this.prisma.crystal.updateMany({
          where: { id: crystal.id, pickedAt: { lte: new Date(Date.now() - RESPAWN_AFTER_MS) } },
          data: { ...point, pickedAt: null, pickedByUserId: null },
        });
      }
      crystals = await this.prisma.crystal.findMany({
        where: { chunkX: { gte: minChunkX, lte: maxChunkX }, chunkY: { gte: minChunkY, lte: maxChunkY } },
      });
    }

    return crystals
      .filter((crystal) => crystal.pickedAt === null)
      .map((c) => ({ ...c,
        distanceMeters: haversineDistanceMeters(lat, lng, c.lat, c.lng),
      }))
      .filter((c) => c.distanceMeters <= visibilityRadiusM)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  private async ensureChunkCrystal(chunkX: number, chunkY: number) {
    let crystal = await this.prisma.crystal.findUnique({
      where: { chunkX_chunkY: { chunkX, chunkY } },
    });

    if (!crystal) {
      const point = randomPointInChunk(chunkX, chunkY);
      try {
        crystal = await this.prisma.crystal.create({
          data: { chunkX, chunkY, lat: point.lat, lng: point.lng, reward: 1 },
        });
      } catch {
        crystal = await this.prisma.crystal.findUniqueOrThrow({
          where: { chunkX_chunkY: { chunkX, chunkY } },
        });
      }
      return crystal;
    }

    const isStalePicked =
      crystal.pickedAt &&
      Date.now() - crystal.pickedAt.getTime() > RESPAWN_AFTER_MS;

    if (isStalePicked) {
      const point = randomPointInChunk(chunkX, chunkY);
      crystal = await this.prisma.crystal.update({
        where: { id: crystal.id },
        data: {
          lat: point.lat,
          lng: point.lng,
          pickedAt: null,
          pickedByUserId: null,
        },
      });
    }

    return crystal;
  }

  async collect(userId: string, crystalId: string, lat: number, lng: number) {
    const crystal = await this.prisma.crystal.findUnique({
      where: { id: crystalId },
    });

    if (!crystal) {
      throw new NotFoundException({
        code: 'CRYSTAL_NOT_FOUND',
        message: 'Кристалл не найден',
      });
    }

    if (crystal.pickedAt !== null) {
      throw new BadRequestException({
        code: 'ALREADY_PICKED',
        message: 'Этот кристалл уже собран — вернётся через 24 часа',
      });
    }

    const distance = haversineDistanceMeters(lat, lng, crystal.lat, crystal.lng);
    const player = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { glovesLevel: true } });
    const pickupRadius = PICKUP_RADIUS_M + ([0, 50, 100, 150, 200][player.glovesLevel] ?? 0);
    if (distance > pickupRadius) {
      throw new BadRequestException({
        code: 'TOO_FAR',
        message: `Подойди ближе чем на ${pickupRadius} м, чтобы забрать кристалл`,
      });
    }

    // Атомарная выдача награды. Без этого два параллельных запроса могли
    // одновременно увидеть pickedAt=null и начислить один кристалл дважды.
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.crystal.updateMany({
        where: {
          id: crystalId,
          pickedAt: null,
        },
        data: {
          pickedAt: new Date(),
          pickedByUserId: userId,
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException({
          code: 'ALREADY_PICKED',
          message: 'Этот кристалл уже собран — вернётся через 24 часа',
        });
      }

      await tx.wallet.update({
        where: { userId },
        data: { crystalsBalance: { increment: crystal.reward } },
      });

      await tx.transaction.create({
        data: {
          wallet: { connect: { userId } },
          type: 'earn',
          source: 'crystal_pickup',
          amount: crystal.reward,
          currency: 'crystals',
          metadata: { crystalId },
        },
      });

      return { success: true, reward: crystal.reward };
    });
  }
}
