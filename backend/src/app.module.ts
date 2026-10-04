import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PoiModule } from './poi/poi.module';
import { VisitsModule } from './visits/visits.module';
import { EconomyModule } from './economy/economy.module';
import { ProgressionModule } from './progression/progression.module';
import { UgcModule } from './ugc/ugc.module';
import { SocialModule } from './social/social.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CrystalsModule } from './crystals/crystals.module';
import { GameModule } from './game/game.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    PoiModule,
    VisitsModule,
    EconomyModule,
    ProgressionModule,
    UgcModule,
    SocialModule,
    NotificationsModule,
    CrystalsModule,
    GameModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
