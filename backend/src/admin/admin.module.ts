import { Module } from '@nestjs/common';
import { AdminController, AdminMapPreviewController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({ controllers: [AdminController, AdminMapPreviewController], providers: [AdminService, RolesGuard] })
export class AdminModule {}
