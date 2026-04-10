import { Module } from '@nestjs/common';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderAdminController } from './controllers/order-admin.controller';
import { OrderController } from './controllers/order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderAdminService } from './services/order-admin.service';
import { OrderService } from './services/order.service';

@Module({
  imports: [ShippingModule],
  controllers: [OrderController, OrderAdminController],
  providers: [OrderService, OrderAdminService, OrderRepository],
})
export class OrderModule {}
