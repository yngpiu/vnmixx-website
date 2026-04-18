import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ShopPageVisitController } from './shop-page-visit.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController, ShopPageVisitController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
