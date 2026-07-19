import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VisitsService } from './visits.service';
import { StartAttemptDto, HeartbeatDto, ProofDto } from './dto/attempt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('visits')
@Controller('visits')
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private visitsService: VisitsService) {}

  @Post('attempt')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // ужесточённый лимит, см. SRS п.11.1
  startAttempt(@CurrentUser() user: CurrentUserPayload, @Body() dto: StartAttemptDto) {
    return this.visitsService.startAttempt(user.userId, dto);
  }

  @Post(':attemptId/heartbeat')
  heartbeat(
    @CurrentUser() user: CurrentUserPayload,
    @Param('attemptId') attemptId: string,
    @Body() dto: HeartbeatDto,
  ) {
    return this.visitsService.heartbeat(user.userId, attemptId, dto);
  }

  @Post(':attemptId/proof')
  submitProof(
    @CurrentUser() user: CurrentUserPayload,
    @Param('attemptId') attemptId: string,
    @Body() dto: ProofDto,
  ) {
    return this.visitsService.submitProof(user.userId, attemptId, dto);
  }

  @Post(':attemptId/complete')
  complete(@CurrentUser() user: CurrentUserPayload, @Param('attemptId') attemptId: string) {
    return this.visitsService.complete(user.userId, attemptId);
  }

  @Get('history')
  history(@CurrentUser() user: CurrentUserPayload) {
    return this.visitsService.history(user.userId);
  }
}
