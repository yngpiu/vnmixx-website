import { Module } from '@nestjs/common';
import { WishlistController } from './controllers/wishlist.controller';
import { WishlistRepository } from './repositories/wishlist.repository';
import { WishlistService } from './services/wishlist.service';

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, WishlistRepository],
})
export class WishlistModule {}
