import { Module } from '@nestjs/common';
import { PoiService } from './poi.service';
import { PoiController } from './poi.controller';

@Module({
  providers: [PoiService],
  controllers: [PoiController],
  exports: [PoiService],
})
export class PoiModule {}
