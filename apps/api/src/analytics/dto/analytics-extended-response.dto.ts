import { ApiProperty } from '@nestjs/swagger';

class PeriodDto {
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  from!: string;

  @ApiProperty({ example: '2026-01-07T23:59:59.999Z' })
  to!: string;
}

class KpisDto {
  @ApiProperty()
  gmv!: number;

  @ApiProperty()
  completedRevenue!: number;

  @ApiProperty()
  ordersCreatedCount!: number;

  @ApiProperty()
  ordersCompletedCount!: number;

  @ApiProperty()
  ordersPendingCount!: number;

  @ApiProperty()
  ordersInTransitCount!: number;

  @ApiProperty()
  cancelledCount!: number;

  @ApiProperty()
  returnedCount!: number;

  @ApiProperty({ nullable: true })
  aovCompleted!: number | null;
}

export class MetricDeltaDto {
  @ApiProperty()
  current!: number;

  @ApiProperty()
  previous!: number;

  @ApiProperty({
    nullable: true,
    description: 'Phần trăm thay đổi; null nếu kỳ trước = 0 và kỳ này > 0.',
  })
  deltaPercent!: number | null;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trendDirection!: 'up' | 'down' | 'flat';

  @ApiProperty({
    description:
      'true = giá trị cao hơn là tốt (GMV, đơn hoàn thành); false = thấp hơn là tốt (hủy/hoàn).',
  })
  higherIsBetter!: boolean;
}

export class NullableMetricDeltaDto {
  @ApiProperty({ nullable: true })
  current!: number | null;

  @ApiProperty({ nullable: true })
  previous!: number | null;

  @ApiProperty({ nullable: true })
  deltaPercent!: number | null;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trendDirection!: 'up' | 'down' | 'flat';

  @ApiProperty()
  higherIsBetter!: boolean;
}

export class KpiDeltasDto {
  @ApiProperty({ type: MetricDeltaDto })
  gmv!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  completedRevenue!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  ordersCreatedCount!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  ordersCompletedCount!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  ordersPendingCount!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  ordersInTransitCount!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  cancelledCount!: MetricDeltaDto;

  @ApiProperty({ type: MetricDeltaDto })
  returnedCount!: MetricDeltaDto;

  @ApiProperty({ type: NullableMetricDeltaDto })
  aovCompleted!: NullableMetricDeltaDto;
}

export class AnalyticsKpisWithDeltaResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({
    type: PeriodDto,
    description: 'Kỳ so sánh (cùng số ngày, nằm ngay trước kỳ hiện tại).',
  })
  comparisonPeriod!: PeriodDto;

  @ApiProperty({ type: KpisDto })
  kpis!: KpisDto;

  @ApiProperty({ type: KpisDto })
  previousKpis!: KpisDto;

  @ApiProperty({ type: KpiDeltasDto })
  deltas!: KpiDeltasDto;
}

export class AnalyticsStatusBreakdownOnlyResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ type: Array })
  statusBreakdown!: Array<{ status: string; count: number; gmv: number }>;
}

export class AnalyticsPaymentMethodMixOnlyResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ type: Array })
  paymentMethodMix!: Array<{ method: string; orderCount: number }>;
}

export class AnalyticsPaymentStatusMixOnlyResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ type: Array })
  paymentStatusMix!: Array<{ paymentStatus: string; count: number }>;
}

export class AnalyticsPendingOrdersOnlyResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ type: Array })
  recentOrdersNeedingAction!: Array<{
    orderCode: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
    customerFullName: string;
  }>;
}

export class TopProductItemDto {
  @ApiProperty({ example: 'Áo thun' })
  productName!: string;

  @ApiProperty({ description: 'Tổng số lượng bán (theo dòng order item).' })
  unitsSold!: number;

  @ApiProperty({ description: 'Tổng subtotal trong kỳ (đơn tạo, trừ hủy/hoàn).' })
  revenue!: number;
}

export class AnalyticsTopProductsResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ type: [TopProductItemDto] })
  products!: TopProductItemDto[];

  @ApiProperty({ description: 'true nếu chưa có đơn hợp lệ trong kỳ.' })
  empty!: boolean;
}

export class ReviewRatingBucketDto {
  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ example: 120 })
  count!: number;
}

export class LatestPublicReviewDto {
  @ApiProperty({ example: 4.5 })
  averageRating!: number;

  @ApiProperty({ example: 'Exceeded my expectations!' })
  title!: string;

  @ApiProperty({ example: 'The quality is outstanding and easy to use.' })
  content!: string;

  @ApiProperty({ example: 'Sarah J.' })
  customerDisplayName!: string;

  @ApiProperty({ example: true })
  isVerifiedPurchase!: boolean;

  @ApiProperty({ example: '2026-04-12T10:30:00.000Z' })
  createdAt!: Date;
}

export class AnalyticsReviewsSummaryResponseDto {
  @ApiProperty({ type: PeriodDto })
  period!: PeriodDto;

  @ApiProperty({ example: 4.3 })
  averageRating!: number;

  @ApiProperty({ example: 230 })
  totalReviews!: number;

  @ApiProperty({ type: [ReviewRatingBucketDto] })
  ratingBreakdown!: ReviewRatingBucketDto[];

  @ApiProperty({ type: LatestPublicReviewDto, nullable: true })
  latestReview!: LatestPublicReviewDto | null;
}
