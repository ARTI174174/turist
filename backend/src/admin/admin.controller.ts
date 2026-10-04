import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview') overview() { return this.admin.overview(); }
  @Get('categories') categories() { return this.admin.categories(); }
  @Get('poi') listPoi(@Query('search') search?: string) { return this.admin.listPoi(search); }
  @Post('poi/bulk') bulkPoi(@Body('items') items: unknown) { return this.admin.bulkPoi(items); }
  @Patch('poi/:id') updatePoi(@Param('id') id: string, @Body() body: unknown) { return this.admin.updatePoi(id, body); }
  @Delete('poi/:id') archivePoi(@Param('id') id: string) { return this.admin.archivePoi(id); }
  @Get('shop') shop() { return this.admin.shop(); }
  @Post('shop') createShopItem(@Body() body: unknown) { return this.admin.createShopItem(body); }
  @Patch('shop/:id') updateShopItem(@Param('id') id: string, @Body() body: unknown) { return this.admin.updateShopItem(id, body); }
  @Get('shop-upgrades') shopUpgrades() { return this.admin.upgradeSettings(); }
  @Patch('shop-upgrades/:kind/:level') updateShopUpgrade(@Param('kind') kind: string, @Param('level') level: string, @Body() body: unknown) { return this.admin.updateUpgrade(kind, level, body); }
  @Get('players') players(@Query('search') search?: string) { return this.admin.players(search); }
  @Get('crystals') crystals() { return this.admin.crystals(); }
  @Post('crystals') createCrystal(@Body() body: unknown) { return this.admin.createCrystal(body); }
  @Patch('crystals/:id') moveCrystal(@Param('id') id: string, @Body() body: unknown) { return this.admin.moveCrystal(id, body); }
  @Delete('crystals/:id') deleteCrystal(@Param('id') id: string) { return this.admin.deleteCrystal(id); }
  @Get('snapshot') snapshot() { return this.admin.snapshot(); }
}

// Для карты панели можно показывать только опубликованные публичные точки.
// Секретные/скрытые места, игроки и любые операции редактирования требуют admin.
@ApiTags('admin')
@Controller('admin/map-preview')
export class AdminMapPreviewController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  preview() { return this.admin.mapPreview(); }
}
