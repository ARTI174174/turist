import { Body, Controller, Delete, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangeNicknameDto, ChangePasswordDto, ChangeAvatarDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.logout(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('nickname')
  changeNickname(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangeNicknameDto) {
    return this.authService.changeNickname(user.userId, dto.nickname);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  changeAvatar(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangeAvatarDto) {
    return this.authService.changeAvatar(user.userId, dto.avatarEmoji);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@CurrentUser() user: CurrentUserPayload) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId: user.userId, revoked: false },
        data: { revoked: true },
      }),
      this.prisma.user.update({
        where: { id: user.userId },
        data: {
          status: 'deleted',
          nickname: `deleted_${user.userId.slice(0, 8)}`,
          nicknameLower: `deleted_${user.userId.slice(0, 8)}`,
          email: null,
          passwordHash: 'DELETED',
        },
      }),
    ]);
    return { success: true };
  }
}
