import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminReviewController } from './controllers/admin-review.controller';
import { PublicShopProductReviewController } from './controllers/public-shop-product-review.controller';
import { ReviewRepository } from './repositories/review.repository';
import { ReviewService } from './services/review.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReviewController, PublicShopProductReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [ReviewService],
})
export class ReviewModule {}
