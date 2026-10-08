import { Controller, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { CategoryQuestsService } from './category-quests.service';
import { ApiTags } from '@nestjs/swagger';
import { ProgressionService } from './progression.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('progression')
@Controller('progress')
@UseGuards(JwtAuthGuard)
class ProgressionController {
  constructor(private progressionService: ProgressionService) {}

  @Get()
  getProgress(@CurrentUser() user: CurrentUserPayload) {
    return this.progressionService.getProgress(user.userId);
  }
}

@ApiTags('quests')
@Controller('quests')
@UseGuards(JwtAuthGuard)
class QuestsController {
  constructor(private progressionService: ProgressionService, private categoryQuests: CategoryQuestsService) {}

  @Get('categories')
  categories(@CurrentUser() user: CurrentUserPayload) { return this.categoryQuests.list(user.userId); }

  @Post('categories/:code/claim')
  claim(@CurrentUser() user: CurrentUserPayload, @Param('code') code: string) { return this.categoryQuests.claim(user.userId, code); }

  // Вехи «Посетить N мест» (SRS: экран «Задания»)
  @Get('milestones')
  getMilestones(@CurrentUser() user: CurrentUserPayload) {
    return this.progressionService.getVisitMilestonesStatus(user.userId);
  }
}

@Module({
  providers: [ProgressionService, CategoryQuestsService],
  controllers: [ProgressionController, QuestsController],
  exports: [ProgressionService],
})
export class ProgressionModule {}
