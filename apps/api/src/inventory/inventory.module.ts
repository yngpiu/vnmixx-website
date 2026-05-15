import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { InventoryAdminController } from './controllers/inventory-admin.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryAdminService } from './services/inventory-admin.service';

@Module({
  imports: [AuditLogModule],
  controllers: [InventoryAdminController],
  providers: [InventoryAdminService, InventoryRepository],
})
export class InventoryModule {}
