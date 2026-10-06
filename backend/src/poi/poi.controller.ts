import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PoiService } from './poi.service';
import { QueryPoiDto } from './dto/query-poi.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePoiCommentDto } from './dto/create-poi-comment.dto';

@ApiTags('poi')
@Controller('poi')
export class PoiController {
  constructor(
    private poiService: PoiService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findInBbox(@Query() query: QueryPoiDto, @CurrentUser() user: CurrentUserPayload) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId: user.userId } });
    return this.poiService.findInBbox(query, progress?.xp ?? 0, user.userId);
  }

  @Get('categories')
  listCategories() {
    return this.poiService.listCategories();
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  async findNearby(@Query() query: QueryPoiDto, @CurrentUser() user: CurrentUserPayload) {
    const progress = await this.prisma.userProgress.findUnique({ where: { userId: user.userId } });
    return this.poiService.findNearby(
      query.lat!,
      query.lng!,
      query.radiusM ?? 1000,
      progress?.xp ?? 0,
      user.userId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.poiService.findById(id);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  listComments(@Param('id') id: string) {
    return this.poiService.listComments(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePoiCommentDto,
  ) {
    return this.poiService.createComment(id, user.userId, dto.text);
  }
}
