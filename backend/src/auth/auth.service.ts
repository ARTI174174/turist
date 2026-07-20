import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async issueTokens(user: { id: string; nickname: string; role: string }) {
    const payload = { sub: user.id, nickname: user.nickname, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev_secret_change_me',
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });

    const rawRefreshToken = randomUUID() + '.' + randomUUID();
    const refreshTokenHash = await argon2.hash(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней, синхронизировано с JWT_REFRESH_TTL по умолчанию

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async register(dto: RegisterDto) {
    const nicknameLower = dto.nickname.toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { nicknameLower },
    });
    if (existing) {
      throw new ConflictException({
        code: 'NICKNAME_TAKEN',
        message: 'Такой ник уже занят, выберите другой',
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        nickname: dto.nickname,
        nicknameLower,
        passwordHash,
        character: { create: { archetype: dto.archetype, avatarEmoji: dto.avatarEmoji ?? '🙂' } },
        wallet: { create: { coinsBalance: 0, crystalsBalance: 0 } },
        progress: { create: { xp: 0, rankCode: 'novice' } },
      },
      include: { character: true, wallet: true, progress: true },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { nicknameLower: dto.nickname.toLowerCase() },
      include: { character: true, wallet: true, progress: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный ник или пароль',
      });
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный ник или пароль',
      });
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_RESTRICTED',
        message: 'Аккаунт временно ограничен',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(rawRefreshToken: string) {
    // Перебираем активные (не отозванные, не истёкшие) токены — для MVP admissible;
    // при масштабировании токен можно снабдить префиксом userId для точечного поиска.
    const candidates = await this.prisma.refreshToken.findMany({
      where: { revoked: false, expiresAt: { gt: new Date() } },
      include: { user: { include: { character: true, wallet: true, progress: true } } },
    });

    for (const candidate of candidates) {
      const matches = await argon2.verify(candidate.tokenHash, rawRefreshToken);
      if (matches) {
        // Ротация: старый токен отзывается, выдаётся новая пара
        await this.prisma.refreshToken.update({
          where: { id: candidate.id },
          data: { revoked: true },
        });
        const tokens = await this.issueTokens(candidate.user);
        return { user: this.toPublicUser(candidate.user), ...tokens };
      }
    }

    // Токен не найден среди активных — возможна попытка повторного использования
    // украденного/уже отозванного токена. В проде: инвалидировать всю цепочку сессий пользователя.
    throw new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Сессия недействительна, требуется повторный вход',
    });
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }

  private toPublicUser(user: any) {
    return {
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      character: user.character,
      wallet: user.wallet,
      progress: user.progress,
      createdAt: user.createdAt,
    };
  }
}
