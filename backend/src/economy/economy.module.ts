import { Body, Controller, Get, Module, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('economy')
@Controller()
@UseGuards(JwtAuthGuard)
class EconomyController {
  constructor(private economyService: EconomyService) {}

  @Get('wallet')
  getWallet(@CurrentUser() user: CurrentUserPayload) {
    return this.economyService.getWallet(user.userId);
  }

  @Get('wallet/transactions')
  getTransactions(@CurrentUser() user: CurrentUserPayload) {
    return this.economyService.getTransactions(user.userId);
  }

  @Get('shop/items')
  listShopItems(@Query('category') category?: string) {
    return this.economyService.listShopItems(category);
  }

  @Post('shop/purchase')
  purchase(@CurrentUser() user: CurrentUserPayload, @Body('shopItemId') shopItemId: string) {
    return this.economyService.purchase(user.userId, shopItemId);
  }

  @Get('inventory')
  getInventory(@CurrentUser() user: CurrentUserPayload) {
    return this.economyService.getInventory(user.userId);
  }
}

@Module({
  providers: [EconomyService],
  controllers: [EconomyController],
  exports: [EconomyService],
})
export class EconomyModule {}
