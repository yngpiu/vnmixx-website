import { ApiProperty } from '@nestjs/swagger';

class PeriodDto {
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  from: string;

  @ApiProperty({ example: '2026-01-31T23:59:59.999Z' })
  to: string;
}

class KpisDto {
  @ApiProperty({
    description:
      'GMV kỳ: SUM(total) đơn tạo trong kỳ, trừ CANCELLED/RETURNED. Không phải doanh thu thuần (COD chưa thu vẫn tính).',
  })
  gmv: number;

  @ApiProperty({
    description:
      'Doanh thu hoàn thành kỳ: SUM(total) đơn DELIVERED có updatedAt trong kỳ (xấp xỉ giao xong trong kỳ).',
  })
  completedRevenue: number;

  @ApiProperty({ description: 'Số đơn có createdAt trong kỳ.' })
  ordersCreatedCount: number;

  @ApiProperty({ description: 'Số đơn DELIVERED có updatedAt trong kỳ.' })
  ordersCompletedCount: number;

  @ApiProperty({
    description: 'Số đơn trạng thái PENDING có createdAt trong kỳ (đặt trong kỳ, vẫn chờ xử lý).',
  })
  ordersPendingCount: number;

  @ApiProperty({
    description:
      'Số đơn trạng thái SHIPPED có createdAt trong kỳ (đơn tạo trong kỳ đang ở bước giao).',
  })
  ordersInTransitCount: number;

  @ApiProperty({ description: 'Số đơn CANCELLED có updatedAt trong kỳ.' })
  cancelledCount: number;

  @ApiProperty({ description: 'Số đơn RETURNED có updatedAt trong kỳ.' })
  returnedCount: number;

  @ApiProperty({
    nullable: true,
    description: 'AOV trên đơn hoàn thành kỳ: completedRevenue / ordersCompletedCount.',
  })
  aovCompleted: number | null;
}

class StatusBreakdownItemDto {
  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 12 })
  count: number;

  @ApiProperty({
    description: 'SUM(total) các đơn thuộc status này, createdAt trong kỳ.',
  })
  gmv: number;
}

class PaymentMethodMixItemDto {
  @ApiProperty({ example: 'COD' })
  method: string;

  @ApiProperty({ example: 40 })
  orderCount: number;
}

class PaymentStatusMixItemDto {
  @ApiProperty({ example: 'SUCCESS' })
  paymentStatus: string;

  @ApiProperty({ example: 35 })
  count: number;
}

class RecentOrderNeedingActionDto {
  @ApiProperty({ example: 'VNM260410A1B2C' })
  orderCode: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'PENDING' })
  paymentStatus: string;

  @ApiProperty({ example: 528000 })
  total: number;

  @ApiProperty({ example: '2026-04-10T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty()
  customerFullName: string;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ type: KpisDto })
  kpis: KpisDto;

  @ApiProperty({ type: [StatusBreakdownItemDto] })
  statusBreakdown: StatusBreakdownItemDto[];

  @ApiProperty({ type: [PaymentMethodMixItemDto] })
  paymentMethodMix: PaymentMethodMixItemDto[];

  @ApiProperty({ type: [PaymentStatusMixItemDto] })
  paymentStatusMix: PaymentStatusMixItemDto[];

  @ApiProperty({ type: [RecentOrderNeedingActionDto] })
  recentOrdersNeedingAction: RecentOrderNeedingActionDto[];
}

export class AnalyticsTimeseriesPointDto {
  @ApiProperty({ example: '2026-04-10' })
  bucketDate: string;

  @ApiProperty({
    description: 'GMV theo ngày tạo đơn (trừ CANCELLED/RETURNED).',
  })
  gmv: number;

  @ApiProperty({ description: 'Số đơn tạo trong ngày (bucket).' })
  ordersCreated: number;

  @ApiProperty({
    description: 'Số đơn chuyển sang DELIVERED trong ngày (theo updatedAt bucket).',
  })
  ordersCompleted: number;

  @ApiProperty({ description: 'Số đơn chuyển sang CANCELLED trong ngày (theo updatedAt).' })
  cancelled: number;
}

export class AnalyticsTimeseriesResponseDto {
  @ApiProperty({ type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ type: [AnalyticsTimeseriesPointDto] })
  data: AnalyticsTimeseriesPointDto[];
}

export class AnalyticsTopCityItemDto {
  @ApiProperty({ example: 'Hồ Chí Minh' })
  city: string;

  @ApiProperty({
    description: 'SUM(total) đơn tạo trong kỳ, trừ CANCELLED/RETURNED.',
  })
  gmv: number;

  @ApiProperty({ example: 15 })
  orderCount: number;
}

export class AnalyticsTopShippingCitiesResponseDto {
  @ApiProperty({ type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ type: [AnalyticsTopCityItemDto] })
  cities: AnalyticsTopCityItemDto[];
}
