import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  nickname: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_ACCESS_SECRET ?? (process.env.NODE_ENV === 'test' ? 'test-only-secret-not-for-deployment-000000000000' : undefined);
    if (!secret || secret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 characters');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, nickname: true, role: true, status: true },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException();
    // Роль и ник берём из БД, поэтому блокировка/снятие админских прав
    // начинает действовать сразу, а не после истечения access-токена.
    return { userId: user.id, nickname: user.nickname, role: user.role };
  }
}
