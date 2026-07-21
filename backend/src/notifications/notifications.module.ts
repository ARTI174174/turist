import { Controller, Get, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.prisma.notification.count({
      where: { userId: user.userId, readAt: null },
    });
    return { count };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}

@Module({
  controllers: [NotificationsController],
})
export class NotificationsModule {}
