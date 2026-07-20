import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuickSubmissionDto } from './dto/quick-submission.dto';

@Injectable()
export class UgcService {
  constructor(private prisma: PrismaService) {}

  /**
   * FR-UGC-01 (упрощённая версия): любой игрок может быстро предложить
   * точку прямо из экрана «Задания» — короткое описание + текущие координаты.
   * Попадает в очередь на рассмотрение (status: pending), баллы за такие
   * «авторские» точки после одобрения настраиваются администратором
   * (см. SRS FR-UGC-05, «красный» уровень баллов — от 200, редактируется).
   */
  async submitQuick(userId: string, dto: QuickSubmissionDto) {
    // Категория по умолчанию для предложенных мест — «редкое место»,
    // модератор сможет переопределить при рассмотрении.
    const category = await this.prisma.poiCategory.upsert({
      where: { code: 'rare' },
      update: {},
      create: { code: 'rare', title: 'Редкое место', colorHex: '#9C27B0' },
    });

    return this.prisma.poiSubmission.create({
      data: {
        submittedBy: userId,
        title: dto.description.slice(0, 50),
        description: dto.description,
        lat: dto.lat,
        lng: dto.lng,
        categoryId: category.id,
        status: 'pending',
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.poiSubmission.findMany({
      where: { submittedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
