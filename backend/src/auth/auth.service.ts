import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const AVATAR_PRICES: Record<string, number> = {
  '/assets/avatars/21.jpg': 100,
  '/assets/avatars/22.jpg': 200,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async issueTokens(user: { id: string; nickname: string; role: string }) {
    const payload = { sub: user.id, nickname: user.nickname, role: user.role };
    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev_secret_change_me';

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });

    const rawRefreshToken = randomUUID() + '.' + randomUUID();
    const refreshTokenHash = await argon2.hash(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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
        character: { create: { archetype: dto.archetype, avatarEmoji: dto.avatarEmoji ?? '/assets/avatars/1.jpg' } },
        wallet: { create: { coinsBalance: 0, crystalsBalance: 0 } },
        progress: { create: { xp: 0, rankCode: 'novice' } },
      },
      include: { character: { include: { ownedAvatars: true } }, wallet: true, progress: true },
    });
    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { nicknameLower: dto.nickname.toLowerCase() },
      include: { character: { include: { ownedAvatars: true } }, wallet: true, progress: true },
    });

    // Не раскрываем, существует ли такой пользователь.
    if (!user || user.status !== 'active') {
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken || rawRefreshToken.length > 200) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Сессия недействительна, требуется повторный вход',
      });
    }

    const candidates = await this.prisma.refreshToken.findMany({
      where: { revoked: false, expiresAt: { gt: new Date() } },
      include: { user: { include: { character: { include: { ownedAvatars: true } }, wallet: true, progress: true } } },
    });

    for (const candidate of candidates) {
      const matches = await argon2.verify(candidate.tokenHash, rawRefreshToken);
      if (!matches) continue;

      // Атомарная ротация: только один параллельный запрос может "забрать"
      // конкретный refresh-token. Это закрывает race condition при двойном refresh.
      const rotated = await this.prisma.refreshToken.updateMany({
        where: {
          id: candidate.id,
          revoked: false,
          expiresAt: { gt: new Date() },
        },
        data: { revoked: true },
      });

      if (rotated.count !== 1) {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Сессия недействительна, требуется повторный вход',
        });
      }

      const tokens = await this.issueTokens(candidate.user);
      return { user: this.toPublicUser(candidate.user), ...tokens };
    }

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

  async changeNickname(userId: string, newNickname: string) {
    const nicknameLower = newNickname.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { nicknameLower } });
    if (existing && existing.id !== userId) {
      throw new ConflictException({ code: 'NICKNAME_TAKEN', message: 'Такой ник уже занят, выберите другой' });
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { nickname: newNickname, nicknameLower },
      include: { character: { include: { ownedAvatars: true } }, wallet: true, progress: true },
    });

    return this.toPublicUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Текущий пароль неверен' });
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    return { success: true };
  }

  async changeAvatar(userId: string, avatarEmoji: string) {
    const avatarNumber = Number(avatarEmoji.match(/^\/assets\/avatars\/(\d+)\.jpg$/)?.[1]);
    const price = AVATAR_PRICES[avatarEmoji] ?? 0;

    return this.prisma.$transaction(async (tx) => {
      if (price > 0) {
        const alreadyOwned = await tx.userOwnedAvatar.findUnique({
          where: { userId_avatarNumber: { userId, avatarNumber } },
        });

        if (!alreadyOwned) {
          const charged = await tx.wallet.updateMany({
            where: { userId, crystalsBalance: { gte: price } },
            data: { crystalsBalance: { decrement: price } },
          });
          if (charged.count !== 1) {
            throw new BadRequestException({
              code: 'INSUFFICIENT_CRYSTALS',
              message: `Для этого аватара нужно ${price} 💎`,
            });
          }

          const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'spend',
              source: 'avatar_purchase',
              amount: price,
              currency: 'crystals',
              metadata: { avatarNumber },
            },
          });
          await tx.userOwnedAvatar.create({ data: { userId, avatarNumber } });
        }
      }

      const [character, wallet] = await Promise.all([
        tx.characterProfile.update({ where: { userId }, data: { avatarEmoji } }),
        tx.wallet.findUniqueOrThrow({ where: { userId } }),
      ]);
      const ownedAvatars = await tx.userOwnedAvatar.findMany({
        where: { userId },
        select: { avatarNumber: true },
      });

      return {
        character: { ...character, ownedAvatarIds: ownedAvatars.map(({ avatarNumber: id }) => id) },
        wallet,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private toPublicUser(user: any) {
    const character = user.character
      ? {
          ...user.character,
          ownedAvatarIds: (user.character.ownedAvatars ?? []).map(({ avatarNumber }: { avatarNumber: number }) => avatarNumber),
        }
      : null;
    return {
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      character,
      wallet: user.wallet,
      progress: user.progress,
      createdAt: user.createdAt,
    };
  }
}
