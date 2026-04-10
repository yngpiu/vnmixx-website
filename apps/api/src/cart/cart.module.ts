import { Module } from '@nestjs/common';
import { CartController } from './controllers/cart.controller';
import { CartRepository } from './repositories/cart.repository';
import { CartService } from './services/cart.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
