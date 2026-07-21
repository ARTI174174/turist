import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PoiModule } from './poi/poi.module';
import { VisitsModule } from './visits/visits.module';
import { EconomyModule } from './economy/economy.module';
import { ProgressionModule } from './progression/progression.module';
import { UgcModule } from './ugc/ugc.module';
import { SocialModule } from './social/social.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100, // базовый лимит: 100 запросов/мин на клиента
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
  ],
})
export class AppModule {}
