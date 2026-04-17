import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderAdminController } from './controllers/order-admin.controller';
import { OrderController } from './controllers/order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderAdminService } from './services/order-admin.service';
import { OrderService } from './services/order.service';

@Module({
  imports: [ShippingModule, AuditLogModule],
  controllers: [OrderController, OrderAdminController],
  providers: [OrderService, OrderAdminService, OrderRepository],
})
export class OrderModule {}
