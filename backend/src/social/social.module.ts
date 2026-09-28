import { Body, Controller, Get, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { SendFriendRequestDto } from './dto/social.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('social')
@Controller('social')
@UseGuards(JwtAuthGuard)
class SocialController {
  constructor(private socialService: SocialService) {}

  // Поиск ТОЛЬКО по полному совпадению ника — список всех игроков никогда не отдаётся
  @Get('search')
  search(@CurrentUser() user: CurrentUserPayload, @Query('nickname') nickname: string) {
    if (!nickname || nickname.length < 3) return null;
    return this.socialService.searchByExactNickname(user.userId, nickname);
  }

  @Post('friends/request')
  sendRequest(@CurrentUser() user: CurrentUserPayload, @Body() dto: SendFriendRequestDto) {
    return this.socialService.sendFriendRequest(user.userId, dto.nickname);
  }

  @Post('friends/:friendshipId/accept')
  accept(@CurrentUser() user: CurrentUserPayload, @Param('friendshipId') friendshipId: string) {
    return this.socialService.respondToRequest(user.userId, friendshipId, true);
  }

  @Post('friends/:friendshipId/decline')
  decline(@CurrentUser() user: CurrentUserPayload, @Param('friendshipId') friendshipId: string) {
    return this.socialService.respondToRequest(user.userId, friendshipId, false);
  }

  @Get('friends')
  listFriends(@CurrentUser() user: CurrentUserPayload) {
    return this.socialService.listFriends(user.userId);
  }

  @Get('friends/:friendUserId/profile')
  friendProfile(@CurrentUser() user: CurrentUserPayload, @Param('friendUserId') friendUserId: string) {
    return this.socialService.getFriendProfile(user.userId, friendUserId);
  }

  @Get('friends/requests')
  listRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.socialService.listIncomingRequests(user.userId);
  }

}

@Module({
  providers: [SocialService],
  controllers: [SocialController],
})
export class SocialModule {}
