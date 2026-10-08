import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

import { validateFlagDesign } from './flag-design';

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
    const design = validateFlagDesign(raw);
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
