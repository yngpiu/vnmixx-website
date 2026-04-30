import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { ShippingModule } from '../shipping/shipping.module';
import { WsJwtGuard } from '../support-chat/ws-jwt.guard';
import { OrderAdminController } from './controllers/order-admin.controller';
import { OrderController } from './controllers/order.controller';
import { SepayWebhookController } from './controllers/sepay-webhook.controller';
import { OrderPaymentGateway } from './gateway/order-payment.gateway';
import { OrderRepository } from './repositories/order.repository';
import { OrderAdminService } from './services/order-admin.service';
import { OrderService } from './services/order.service';
import { SepayService } from './services/sepay.service';

@Module({
  imports: [ShippingModule, AuditLogModule, AuthModule],
  controllers: [OrderController, OrderAdminController, SepayWebhookController],
  providers: [
    OrderService,
    OrderAdminService,
    OrderRepository,
    SepayService,
    OrderPaymentGateway,
    WsJwtGuard,
  ],
})
export class OrderModule {}
