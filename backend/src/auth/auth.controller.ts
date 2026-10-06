import { Body, Controller, Delete, ForbiddenException, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
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

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie('turist_refresh', refreshToken, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: this.isProduction() ? 'none' : 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private isProduction() {
    return process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';
  }

  private assertTrustedRefreshOrigin(request: Request) {
    if (!this.isProduction()) return;
    const origin = request.headers.origin;
    const configuredOrigins = process.env.CORS_ORIGIN
      ?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
    const allowedOrigins = configuredOrigins.length > 0
      ? configuredOrigins
      : ['https://turist-zeta.vercel.app'];
    // The frontend and API may be on different sites (Vercel/Render), so
    // Sec-Fetch-Site can correctly say "cross-site" for the real app. Validate
    // the browser Origin against the same allowlist used by CORS instead.
    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException({ code: 'UNTRUSTED_ORIGIN', message: 'Источник запроса не разрешён' });
    }
  }

  private withoutRefreshToken<T extends { refreshToken: string }>(result: T) {
    const { refreshToken, ...body } = result;
    return body;
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('register-challenge')
  registerChallenge() { return this.authService.createRegisterChallenge(); }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertTrustedRefreshOrigin(request);
    const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('turist_refresh='));
    const refreshToken = cookie ? decodeURIComponent(cookie.slice('turist_refresh='.length)) : '';
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(response, result.refreshToken);
    return this.withoutRefreshToken(result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: CurrentUserPayload, @Res({ passthrough: true }) response: Response) {
    response.clearCookie('turist_refresh', { httpOnly: true, secure: this.isProduction(), sameSite: this.isProduction() ? 'none' : 'lax', path: '/api/v1/auth' });
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
  async deleteAccount(@CurrentUser() user: CurrentUserPayload, @Res({ passthrough: true }) response: Response) {
    response.clearCookie('turist_refresh', { httpOnly: true, secure: this.isProduction(), sameSite: this.isProduction() ? 'none' : 'lax', path: '/api/v1/auth' });
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
