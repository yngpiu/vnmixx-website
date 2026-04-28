import { Module } from '@nestjs/common';
import { DashboardAdminController } from './controllers/dashboard-admin.controller';
import { DashboardAdminService } from './services/dashboard-admin.service';

@Module({
  controllers: [DashboardAdminController],
  providers: [DashboardAdminService],
})
export class DashboardModule {}
