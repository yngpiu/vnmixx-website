import { Module } from '@nestjs/common';
import { DashboardAdminController } from './controllers/dashboard-admin.controller';
import { InventoryAdminController } from './controllers/inventory-admin.controller';
import { DashboardAdminService } from './services/dashboard-admin.service';

@Module({
  controllers: [DashboardAdminController, InventoryAdminController],
  providers: [DashboardAdminService],
})
export class DashboardModule {}
