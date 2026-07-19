import { Module } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { AnticheatService } from './anticheat.service';
import { ProgressionModule } from '../progression/progression.module';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [ProgressionModule, EconomyModule],
  providers: [VisitsService, AnticheatService],
  controllers: [VisitsController],
})
export class VisitsModule {}
