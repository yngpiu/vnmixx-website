import { Module } from '@nestjs/common';
import { InventoryAdminController } from './controllers/inventory-admin.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryAdminService } from './services/inventory-admin.service';

@Module({
  controllers: [InventoryAdminController],
  providers: [InventoryAdminService, InventoryRepository],
})
export class InventoryModule {}
