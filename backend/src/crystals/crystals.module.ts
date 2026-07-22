import { Body, Controller, Get, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CrystalsService } from './crystals.service';
import { CollectCrystalDto } from './dto/collect.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('crystals')
@Controller('crystals')
@UseGuards(JwtAuthGuard)
class CrystalsController {
  constructor(private crystalsService: CrystalsService) {}

  @Get('nearby')
  findNearby(
    @CurrentUser() user: CurrentUserPayload,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.crystalsService.findNearby(user.userId, Number(lat), Number(lng));
  }

  @Post(':id/collect')
  collect(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CollectCrystalDto,
  ) {
    return this.crystalsService.collect(user.userId, id, dto.lat, dto.lng);
  }
}

@Module({
  providers: [CrystalsService],
  controllers: [CrystalsController],
})
export class CrystalsModule {}
