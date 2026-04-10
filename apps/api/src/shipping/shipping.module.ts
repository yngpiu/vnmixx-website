import { Module } from '@nestjs/common';
import { ShippingController } from './controllers/shipping.controller';
import { GhnService } from './services/ghn.service';
import { ShippingService } from './services/shipping.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, GhnService],
  exports: [GhnService],
})
export class ShippingModule {}
