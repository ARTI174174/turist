import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueryPoiDto } from './dto/query-poi.dto';
import { haversineDistanceMeters, parseBbox } from '../common/geo/geo.util';

const SECRET_UNLOCK_XP_THRESHOLD = 10000; // порог способности «Опытный турист», см. SRS п.6.2

@Injectable()
export class PoiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Список точек в видимой области карты, с фильтрацией по категориям
   * и видимости секретных точек в зависимости от прогресса пользователя.
   */
  async findInBbox(query: QueryPoiDto, userXp = 0) {
    const bbox = parseBbox(query.bbox);
    const categoryCodes = query.categories?.split(',').filter(Boolean);

    const where: any = { status: 'active' };

    if (bbox) {
      where.lat = { gte: bbox.minLat, lte: bbox.maxLat };
      where.lng = { gte: bbox.minLng, lte: bbox.maxLng };
    }

    if (categoryCodes?.length) {
      where.category = { code: { in: categoryCodes } };
    }

    // Секретные точки видны только при достаточном прогрессе (FR-POI-02)
    const hasSecretAccess = userXp >= SECRET_UNLOCK_XP_THRESHOLD;
    if (!hasSecretAccess) {
      where.visibility = { in: ['public'] };
    }

    const pois = await this.prisma.poi.findMany({
      where,
      include: { category: true },
      take: 500, // защита от чрезмерно широкого bbox — клиент должен приблизить карту
    });

    return pois;
  }

  async findNearby(lat: number, lng: number, radiusM: number, userXp = 0) {
    const hasSecretAccess = userXp >= SECRET_UNLOCK_XP_THRESHOLD;

    const candidates = await this.prisma.poi.findMany({
      where: {
        status: 'active',
        ...(hasSecretAccess ? {} : { visibility: { in: ['public'] } }),
      },
      include: { category: true },
    });

    return candidates
      .map((poi) => ({
        ...poi,
        distanceMeters: haversineDistanceMeters(lat, lng, poi.lat, poi.lng),
      }))
      .filter((poi) => poi.distanceMeters <= radiusM)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async findById(id: string) {
    const poi = await this.prisma.poi.findUnique({
      where: { id },
      include: { category: true, media: { where: { moderationStatus: 'approved' } } },
    });
    if (!poi) {
      throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });
    }
    return poi;
  }

  async listCategories() {
    return this.prisma.poiCategory.findMany();
  }
}
