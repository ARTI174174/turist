import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { haversineDistanceMeters } from '../common/geo/geo.util';
import { chunkRangeAround, randomPointInChunk } from '../common/geo/chunk.util';

const BASE_VISIBILITY_RADIUS_M = 500;
const PICKUP_RADIUS_M = 50;
const RESPAWN_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CrystalsService {
  constructor(private prisma: PrismaService) {}

  async findNearby(lat: number, lng: number, visibilityRadiusM = BASE_VISIBILITY_RADIUS_M) {
    const { minChunkX, maxChunkX, minChunkY, maxChunkY } = chunkRangeAround(
      lat,
      lng,
      visibilityRadiusM,
    );
    const results: { id: string; lat: number; lng: number; reward: number }[] = [];

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        const crystal = await this.ensureChunkCrystal(cx, cy);
        if (crystal.pickedAt === null) {
          results.push({
            id: crystal.id,
            lat: crystal.lat,
            lng: crystal.lng,
            reward: crystal.reward,
          });
        }
      }
    }

    return results
      .map((c) => ({
        ...c,
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
    if (distance > PICKUP_RADIUS_M) {
      throw new BadRequestException({
        code: 'TOO_FAR',
        message: `Подойди ближе чем на ${PICKUP_RADIUS_M} м, чтобы забрать кристалл`,
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
