import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FlagsService } from './flags.service';

@ApiTags('flags')
@Controller('flags')
@UseGuards(JwtAuthGuard)
export class FlagsController {
  constructor(private flags: FlagsService) {}
  @Get('design') design(@CurrentUser() user: CurrentUserPayload) { return this.flags.design(user.userId); }
  @Patch('design') saveDesign(@CurrentUser() user: CurrentUserPayload, @Body('design') design: unknown) { return this.flags.saveDesign(user.userId, design); }
  @Post(':poiId') place(@CurrentUser() user: CurrentUserPayload, @Param('poiId') poiId: string) { return this.flags.place(user.userId, poiId); }
  @Delete(':poiId') remove(@CurrentUser() user: CurrentUserPayload, @Param('poiId') poiId: string) { return this.flags.remove(user.userId, poiId); }
}
