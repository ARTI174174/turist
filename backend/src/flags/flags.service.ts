import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const PALETTE = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#3F51B5', '#9B59B6', '#EC407A', '#F5F5F5'];
type FlagShape = { type: 'circle'; x: number; y: number; r: number; color: string } | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string };

@Injectable()
export class FlagsService {
  constructor(private prisma: PrismaService) {}
  private async ownsFlag(userId: string) {
    return !!(await this.prisma.inventoryItem.findFirst({ where: { userId, shopItem: { name: 'Флаг путешественника' } }, select: { id: true } }));
  }
  async design(userId: string) {
    const [owned, user, placed] = await Promise.all([
      this.ownsFlag(userId),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { flagDesign: true } }),
      this.prisma.poiFlag.findFirst({ where: { userId }, select: { poiId: true } }),
    ]);
    return { owned, design: Array.isArray(user.flagDesign) ? user.flagDesign : [], placedPoiId: placed?.poiId ?? null };
  }
  async saveDesign(userId: string, raw: unknown) {
    if (!(await this.ownsFlag(userId))) throw new ForbiddenException('Сначала купите флаг путешественника в магазине.');
    if (!Array.isArray(raw) || raw.length > 12) throw new BadRequestException('Флаг может содержать до 12 фигур.');
    const design = raw.map((entry: any): FlagShape => {
      if (!entry || !PALETTE.includes(entry.color)) throw new BadRequestException('Выберите цвет из палитры флага.');
      const coordinate = (value: unknown) => { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 100) throw new BadRequestException('Координаты фигуры вне холста.'); return n; };
      if (entry.type === 'circle') return { type: 'circle', x: coordinate(entry.x), y: coordinate(entry.y), r: Math.min(20, Math.max(2, coordinate(entry.r))), color: entry.color };
      if (entry.type === 'line') return { type: 'line', x1: coordinate(entry.x1), y1: coordinate(entry.y1), x2: coordinate(entry.x2), y2: coordinate(entry.y2), color: entry.color };
      throw new BadRequestException('Поддерживаются только круги и линии.');
    });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { flagDesign: design as Prisma.InputJsonValue }, select: { flagDesign: true } });
    return { success: true, design: user.flagDesign };
  }
  async place(userId: string, poiId: string) {
    if (!(await this.ownsFlag(userId))) throw new ForbiddenException('Сначала купите флаг путешественника в магазине.');
    const [visit, poi, user, existing] = await Promise.all([
      this.prisma.visit.findUnique({ where: { userId_poiId: { userId, poiId } }, select: { id: true } }),
      this.prisma.poi.findUnique({ where: { id: poiId }, select: { id: true, status: true, visibility: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { flagDesign: true } }),
      this.prisma.poiFlag.findUnique({ where: { poiId }, select: { userId: true } }),
    ]);
    if (!poi || poi.status !== 'active' || poi.visibility !== 'public') throw new NotFoundException('Точка недоступна.');
    if (!visit) throw new ForbiddenException('Флаг можно оставить только на уже посещённой точке.');
    if (existing && existing.userId !== userId) throw new BadRequestException('На этой точке уже стоит флаг другого путешественника.');
    const design = (Array.isArray(user.flagDesign) ? user.flagDesign : []) as Prisma.InputJsonValue;
    return this.prisma.$transaction(async (tx) => {
      await tx.poiFlag.deleteMany({ where: { userId } });
      const flag = await tx.poiFlag.upsert({ where: { poiId }, update: { userId, design }, create: { poiId, userId, design } });
      return { success: true, flag };
    });
  }
  async remove(userId: string, poiId: string) {
    const result = await this.prisma.poiFlag.deleteMany({ where: { userId, poiId } });
    if (!result.count) throw new NotFoundException('Ваш флаг на этой точке не найден.');
    return { success: true };
  }
}
