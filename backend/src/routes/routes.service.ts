import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async list(search = '', sort = 'rating') {
    const rows = await this.prisma.route.findMany({
      where: { status: 'approved', ...(search.trim() ? { title: { contains: search.trim().slice(0, 80), mode: 'insensitive' } } : {}) },
      include: { author: { select: { id: true, nickname: true } }, stops: { orderBy: { orderIndex: 'asc' }, include: { poi: { include: { category: true } } } }, reviews: { include: { user: { select: { id: true, nickname: true } } }, orderBy: { createdAt: 'desc' }, take: 50 } },
      take: 100,
    });
    const enriched = rows.map((route) => ({ ...route, rating: route.reviews.length ? route.reviews.reduce((sum, review) => sum + review.rating, 0) / route.reviews.length : 0, reviewCount: route.reviews.length }));
    return enriched.sort((a, b) => sort === 'newest' ? b.createdAt.getTime() - a.createdAt.getTime() : b.rating - a.rating || b.reviewCount - a.reviewCount);
  }

  mine(userId: string) {
    return this.prisma.route.findMany({ where: { createdBy: userId }, include: { stops: { orderBy: { orderIndex: 'asc' }, include: { poi: { include: { category: true } } } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  pending(role: string) {
    if (role !== 'admin') throw new ForbiddenException('Только администратор может проверять маршруты.');
    return this.prisma.route.findMany({ where: { status: 'pending' }, include: { author: { select: { nickname: true } }, stops: { orderBy: { orderIndex: 'asc' }, include: { poi: { select: { title: true } } } } }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: string, raw: { title?: string; description?: string; poiIds?: string[] }) {
    const title = String(raw?.title ?? '').trim();
    const description = String(raw?.description ?? '').trim();
    const poiIds = Array.isArray(raw?.poiIds) ? raw.poiIds : [];
    if (!title || title.length > 100 || description.length > 2000) throw new BadRequestException('Укажите название (до 100 символов) и описание (до 2 000 символов).');
    if (poiIds.length < 1 || poiIds.length > 10 || new Set(poiIds).size !== poiIds.length) throw new BadRequestException('В маршруте должно быть от 1 до 10 разных точек.');
    const points = await this.prisma.poi.findMany({ where: { id: { in: poiIds }, status: 'active', visibility: 'public' }, select: { id: true } });
    if (points.length !== poiIds.length) throw new BadRequestException('В маршруте есть недоступные точки.');
    return this.prisma.route.create({ data: { title, description: description || null, createdBy: userId, status: 'pending', stops: { create: poiIds.map((poiId, orderIndex) => ({ poiId, orderIndex })) } }, include: { stops: { orderBy: { orderIndex: 'asc' }, include: { poi: { select: { title: true } } } } } });
  }

  async review(userId: string, routeId: string, rating: number, rawText: string) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('Оценка должна быть от 1 до 5.');
    const text = String(rawText ?? '').trim();
    if (!text || text.length > 500) throw new BadRequestException('Напишите отзыв (до 500 символов).');
    const route = await this.prisma.route.findFirst({ where: { id: routeId, status: 'approved' }, select: { id: true, createdBy: true } });
    if (!route) throw new NotFoundException('Маршрут не найден.');
    if (route.createdBy === userId) throw new BadRequestException('Нельзя оценивать свой маршрут.');
    return this.prisma.routeReview.upsert({ where: { routeId_userId: { routeId, userId } }, update: { rating, text }, create: { routeId, userId, rating, text } });
  }

  async approve(routeId: string, role: string) {
    if (role !== 'admin') throw new ForbiddenException('Только администратор может публиковать маршруты.');
    const result = await this.prisma.route.updateMany({ where: { id: routeId, status: 'pending' }, data: { status: 'approved' } });
    if (!result.count) throw new NotFoundException('Маршрут не найден или уже проверен.');
    return { success: true };
  }

  async remove(routeId: string, role: string) {
    if (role !== 'admin') throw new ForbiddenException('Только администратор может удалять маршруты.');
    const result = await this.prisma.route.deleteMany({ where: { id: routeId } });
    if (!result.count) throw new NotFoundException('Маршрут не найден.');
    return { success: true };
  }
}
