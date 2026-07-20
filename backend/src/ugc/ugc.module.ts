import { Body, Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UgcService } from './ugc.service';
import { QuickSubmissionDto } from './dto/quick-submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('ugc')
@Controller('poi-submissions')
@UseGuards(JwtAuthGuard)
class UgcController {
  constructor(private ugcService: UgcService) {}

  @Post('quick')
  submitQuick(@CurrentUser() user: CurrentUserPayload, @Body() dto: QuickSubmissionDto) {
    return this.ugcService.submitQuick(user.userId, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.ugcService.listMine(user.userId);
  }
}

@Module({
  providers: [UgcService],
  controllers: [UgcController],
})
export class UgcModule {}
