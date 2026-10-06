import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GameService } from './game.service';
import { BuyUpgradeDto, PublishNewsDto } from './dto/game.dto';

@ApiTags('game')
@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private game: GameService) {}

  @Get('daily') daily(@CurrentUser() user: CurrentUserPayload) { return this.game.daily(user.userId); }
  @Get('welcome') welcome(@CurrentUser() user: CurrentUserPayload) { return this.game.welcomeStatus(user.userId); }
  @Get('camp/stats') campStats(@CurrentUser() user: CurrentUserPayload) { return this.game.campStats(user.userId); }
  @Get('secrets/compass') secretCompass(@CurrentUser() user: CurrentUserPayload, @Query('lat') lat: string, @Query('lng') lng: string) { return this.game.secretCompass(user.userId, Number(lat), Number(lng)); }
  @Post('welcome/complete') completeWelcome(@CurrentUser() user: CurrentUserPayload) { return this.game.completeWelcome(user.userId); }
  @Get('leaderboard') leaderboard() { return this.game.leaderboard(); }
  @Get('expedition') expedition(@CurrentUser() user: CurrentUserPayload) { return this.game.expedition(user.userId); }
  @Get('medals') medals(@CurrentUser() user: CurrentUserPayload) { return this.game.medals(user.userId); }
  @Post('expedition/claim') claimExpedition(@CurrentUser() user: CurrentUserPayload) { return this.game.claimExpedition(user.userId); }
  @Get('roulette') roulette(@CurrentUser() user: CurrentUserPayload) { return this.game.rouletteStatus(user.userId); }
  @Post('roulette') startRoulette(@CurrentUser() user: CurrentUserPayload, @Body() body: { lat: number; lng: number }) { return this.game.startRoulette(user.userId, Number(body?.lat), Number(body?.lng)); }
  @Get('secrets/nearby') secrets(@CurrentUser() user: CurrentUserPayload, @Query('lat') lat: string, @Query('lng') lng: string) { return this.game.nearbySecrets(user.userId, Number(lat), Number(lng)); }
  @Get('news/unread') unreadNews(@CurrentUser() user: CurrentUserPayload) { return this.game.unreadNews(user.userId); }
  @Post('news/:id/read') readNews(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) { return this.game.readNews(user.userId, id); }
  @Post('news') publishNews(@CurrentUser() user: CurrentUserPayload, @Body() body: PublishNewsDto) { return this.game.publishNews(user, body); }
  @Get('shop-upgrades') upgrades(@CurrentUser() user: CurrentUserPayload) { return this.game.getUpgrades(user.userId); }
  @Post('shop-upgrades') buyUpgrade(@CurrentUser() user: CurrentUserPayload, @Body() body: BuyUpgradeDto) { return this.game.buyUpgrade(user.userId, body.kind, body.level); }
  @Post('camp/change') changeCamp(@CurrentUser() user: CurrentUserPayload, @Body('campThemeId') campThemeId: string) { return this.game.changeCamp(user.userId, campThemeId); }
  @Post('shop/random-point') randomPoint(@CurrentUser() user: CurrentUserPayload) { return this.game.buyRandomPoint(user.userId); }
}
