import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueryPoiDto } from './dto/query-poi.dto';
import { haversineDistanceMeters, parseBbox } from '../common/geo/geo.util';
import { levelBorderColor, resolveLevel } from '../progression/progression.service';
import { getUpgradeSettings } from '../common/game-upgrades';

@Injectable()
export class PoiService {
  constructor(private prisma: PrismaService) {}

  private async getVisitedPoiIds(userId?: string): Promise<string[]> {
    if (!userId) return [];
    const visits = await this.prisma.visit.findMany({ where: { userId }, select: { poiId: true } });
    return visits.map((v) => v.poiId);
  }

  /**
   * Список точек в видимой области карты, с фильтрацией по категориям
   * и видимости секретных точек в зависимости от прогресса пользователя.
   * Уже открытые ЭТИМ игроком точки не возвращаются — они "исчезают" с его
   * карты после посещения, оставаясь видимыми для остальных игроков.
   */
  async findInBbox(query: QueryPoiDto, userXp = 0, userId?: string) {
    const bbox = parseBbox(query.bbox);
    const categoryCodes = query.categories?.split(',').filter(Boolean);
    const visitedIds = await this.getVisitedPoiIds(userId);

    const where: any = { status: 'active', visibility: 'public' };

    if (visitedIds.length > 0) {
      where.id = { notIn: visitedIds };
    }

    if (bbox) {
      where.lat = { gte: bbox.minLat, lte: bbox.maxLat };
      where.lng = { gte: bbox.minLng, lte: bbox.maxLng };
    }

    if (categoryCodes?.length) {
      where.category = { code: { in: categoryCodes } };
    }

    // Секреты выдаются отдельным nearby endpoint только игрокам в радиусе обнаружения.

    const pois = await this.prisma.poi.findMany({
      where,
      include: { category: true, secretFinder: { select: { nickname: true } }, flag: { include: { user: { select: { nickname: true } } } } },
      take: 500, // защита от чрезмерно широкого bbox — клиент должен приблизить карту
    });

    if (query.lat == null || query.lng == null || !userId) return pois;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { glassesLevel: true, glovesLevel: true } });
    const [glasses, gloves] = await Promise.all([getUpgradeSettings(this.prisma, 'glasses'), getUpgradeSettings(this.prisma, 'gloves')]);
    const rareRadius = glasses[user?.glassesLevel ?? 0]?.effectValue ?? 500;
    const gloveBonus = gloves[user?.glovesLevel ?? 0]?.effectValue ?? 0;
    return pois
      .filter((poi) => poi.category.code !== 'rare' || haversineDistanceMeters(query.lat!, query.lng!, poi.lat, poi.lng) <= rareRadius)
      .map((poi) => ({ ...poi, geofenceRadiusM: poi.geofenceRadiusM + gloveBonus }));
  }

  async findNearby(lat: number, lng: number, radiusM: number, userXp = 0, userId?: string) {
    const visitedIds = await this.getVisitedPoiIds(userId);

    const candidates = await this.prisma.poi.findMany({
      where: {
        status: 'active',
        ...(visitedIds.length > 0 ? { id: { notIn: visitedIds } } : {}),
        visibility: 'public',
      },
      include: { category: true, secretFinder: { select: { nickname: true } }, flag: { include: { user: { select: { nickname: true } } } } },
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
      include: { category: true, secretFinder: { select: { nickname: true } }, flag: { include: { user: { select: { nickname: true } } } }, media: { where: { moderationStatus: 'approved' } } },
    });
    if (!poi) {
      throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });
    }
    return poi;
  }

  async listCategories() {
    return this.prisma.poiCategory.findMany();
  }

  async listComments(poiId: string) {
    const poi = await this.prisma.poi.findUnique({ where: { id: poiId }, select: { id: true } });
    if (!poi) throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });
    const rows = await this.prisma.poiComment.findMany({
      where: { poiId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { include: { character: true, progress: true } } },
    });
    return rows.map(({ user, ...comment }) => {
      const level = resolveLevel(user.progress?.xp ?? 0).level;
      return {
        ...comment,
        author: {
          id: user.id,
          nickname: user.nickname,
          avatarEmoji: user.character?.avatarEmoji ?? '🙂',
          level,
          borderColor: levelBorderColor(level),
        },
      };
    });
  }

  async createComment(poiId: string, userId: string, text: string) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new BadRequestException({ code: 'COMMENT_EMPTY', message: 'Напишите текст комментария' });
    }
    const poi = await this.prisma.poi.findUnique({ where: { id: poiId }, select: { id: true } });
    if (!poi) throw new NotFoundException({ code: 'POI_NOT_FOUND', message: 'Точка не найдена' });
    return this.prisma.poiComment.create({
      data: { poiId, userId, text: normalizedText },
      include: { user: { include: { character: true, progress: true } } },
    }).then((comment) => {
      const level = resolveLevel(comment.user.progress?.xp ?? 0).level;
      const { user, ...rest } = comment;
      return { ...rest, author: { id: user.id, nickname: user.nickname, avatarEmoji: user.character?.avatarEmoji ?? '🙂', level, borderColor: levelBorderColor(level) } };
    });
  }
}
