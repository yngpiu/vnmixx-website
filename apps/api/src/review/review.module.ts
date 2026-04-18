import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewService } from './review.service';
import { ReviewsAdminController } from './reviews-admin.controller';
import { ReviewsCustomerController } from './reviews-customer.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsAdminController, ReviewsCustomerController],
  providers: [ReviewService],
})
export class ReviewModule {}
