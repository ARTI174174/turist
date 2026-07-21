import { Body, Controller, Get, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { SendFriendRequestDto, SendMessageDto } from './dto/social.dto';
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

  @Get('friends/requests')
  listRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.socialService.listIncomingRequests(user.userId);
  }

  @Post('chat/rooms/:friendUserId')
  getOrCreateRoom(@CurrentUser() user: CurrentUserPayload, @Param('friendUserId') friendUserId: string) {
    return this.socialService.getOrCreateDirectRoom(user.userId, friendUserId);
  }

  @Get('chat/rooms')
  listRooms(@CurrentUser() user: CurrentUserPayload) {
    return this.socialService.listChatRooms(user.userId);
  }

  @Get('chat/rooms/:roomId/messages')
  listMessages(@CurrentUser() user: CurrentUserPayload, @Param('roomId') roomId: string) {
    return this.socialService.listMessages(user.userId, roomId);
  }

  @Post('chat/rooms/:roomId/messages')
  sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.socialService.sendMessage(user.userId, roomId, dto.content);
  }
}

@Module({
  providers: [SocialService],
  controllers: [SocialController],
})
export class SocialModule {}
