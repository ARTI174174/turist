import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private routes: RoutesService) {}
  @Get() list(@Query('search') search: string, @Query('sort') sort: string) { return this.routes.list(search, sort); }
  @Get('mine') mine(@CurrentUser() user: CurrentUserPayload) { return this.routes.mine(user.userId); }
  @Get('pending') pending(@CurrentUser() user: CurrentUserPayload) { return this.routes.pending(user.role); }
  @Post() create(@CurrentUser() user: CurrentUserPayload, @Body() body: { title: string; description: string; poiIds: string[] }) { return this.routes.create(user.userId, body); }
  @Post(':id/reviews') review(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: { rating: number; text: string }) { return this.routes.review(user.userId, id, Number(body.rating), body.text); }
  @Patch(':id/approve') approve(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) { return this.routes.approve(id, user.role); }
  @Delete(':id') remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) { return this.routes.remove(id, user.role); }
}
