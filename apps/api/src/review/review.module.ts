import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminReviewController } from './controllers/admin-review.controller';
import { CustomerReviewController } from './controllers/customer-review.controller';
import { PublicShopProductReviewController } from './controllers/public-shop-product-review.controller';
import { ReviewRepository } from './repositories/review.repository';
import { ReviewService } from './services/review.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AdminReviewController, CustomerReviewController, PublicShopProductReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [ReviewService],
})
export class ReviewModule {}
