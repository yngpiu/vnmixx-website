import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireUserType } from '../auth/decorators';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsDateRangeQueryDto,
  AnalyticsOverviewResponseDto,
  AnalyticsTimeseriesQueryDto,
  AnalyticsTimeseriesResponseDto,
  AnalyticsTopCitiesQueryDto,
  AnalyticsTopShippingCitiesResponseDto,
} from './dto';
import {
  AnalyticsKpisWithDeltaResponseDto,
  AnalyticsPaymentMethodMixOnlyResponseDto,
  AnalyticsPaymentStatusMixOnlyResponseDto,
  AnalyticsPendingOrdersOnlyResponseDto,
  AnalyticsReviewsSummaryResponseDto,
  AnalyticsStatusBreakdownOnlyResponseDto,
  AnalyticsTopProductsResponseDto,
} from './dto/analytics-extended-response.dto';

@ApiTags('Analytics (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@ApiBadRequestResponse({ description: 'Tham số kỳ không hợp lệ.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({
    summary: 'KPI theo kỳ + kỳ trước và delta %',
    description:
      'Kỳ so sánh có cùng số ngày và nằm ngay trước kỳ hiện tại. Định nghĩa KPI giống overview.',
  })
  @ApiOkResponse({ type: AnalyticsKpisWithDeltaResponseDto })
  @Get('kpis-with-delta')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getKpisWithDelta(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsKpisWithDeltaResponseDto> {
    return await this.analyticsService.getKpisWithDelta(query);
  }

  @ApiOperation({
    summary: 'Tổng quan thống kê đơn hàng (GMV, hoàn thành, funnel thanh toán, đơn cần xử lý)',
    description:
      'GMV kỳ = SUM(total) đơn tạo trong kỳ (trừ CANCELLED/RETURNED). Doanh thu hoàn thành = SUM(total) đơn DELIVERED có updatedAt trong kỳ. Đơn chờ xử lý / đang giao = đếm theo createdAt trong kỳ. AOV hoàn thành = completedRevenue / ordersCompletedCount.',
  })
  @ApiOkResponse({ type: AnalyticsOverviewResponseDto })
  @Get('overview')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getOverview(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsOverviewResponseDto> {
    return await this.analyticsService.getOverview(query);
  }

  @ApiOperation({ summary: 'Chỉ breakdown trạng thái đơn (tạo trong kỳ)' })
  @ApiOkResponse({ type: AnalyticsStatusBreakdownOnlyResponseDto })
  @Get('breakdowns/status')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getBreakdownStatus(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsStatusBreakdownOnlyResponseDto> {
    return await this.analyticsService.getStatusBreakdownOnly(query);
  }

  @ApiOperation({ summary: 'Chỉ mix phương thức thanh toán' })
  @ApiOkResponse({ type: AnalyticsPaymentMethodMixOnlyResponseDto })
  @Get('breakdowns/payment-method')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getBreakdownPaymentMethod(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsPaymentMethodMixOnlyResponseDto> {
    return await this.analyticsService.getPaymentMethodMixOnly(query);
  }

  @ApiOperation({ summary: 'Chỉ funnel paymentStatus trên đơn trong kỳ' })
  @ApiOkResponse({ type: AnalyticsPaymentStatusMixOnlyResponseDto })
  @Get('breakdowns/payment-status')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getBreakdownPaymentStatus(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsPaymentStatusMixOnlyResponseDto> {
    return await this.analyticsService.getPaymentStatusMixOnly(query);
  }

  @ApiOperation({ summary: 'Đơn cần xử lý (PENDING hoặc CK chưa thành công)' })
  @ApiOkResponse({ type: AnalyticsPendingOrdersOnlyResponseDto })
  @Get('orders/pending-actions')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getPendingOrders(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsPendingOrdersOnlyResponseDto> {
    return await this.analyticsService.getPendingOrdersOnly(query);
  }

  @ApiOperation({ summary: 'Top sản phẩm theo GMV (subtotal) trong kỳ' })
  @ApiOkResponse({ type: AnalyticsTopProductsResponseDto })
  @Get('top-products')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getTopProducts(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsTopProductsResponseDto> {
    return await this.analyticsService.getTopProducts(query);
  }

  @ApiOperation({ summary: 'Tổng hợp đánh giá khách hàng (rating breakdown + review mới nhất)' })
  @ApiOkResponse({ type: AnalyticsReviewsSummaryResponseDto })
  @Get('reviews/summary')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getReviewsSummary(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsReviewsSummaryResponseDto> {
    return await this.analyticsService.getReviewsSummary(query);
  }

  @ApiOperation({
    summary:
      'Chuỗi thời gian theo ngày (GMV/đơn tạo theo createdAt; hoàn thành/hủy theo updatedAt)',
  })
  @ApiOkResponse({ type: AnalyticsTimeseriesResponseDto })
  @Get('timeseries')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getTimeseries(
    @Query() query: AnalyticsTimeseriesQueryDto,
  ): Promise<AnalyticsTimeseriesResponseDto> {
    return await this.analyticsService.getTimeseries(query);
  }

  @ApiOperation({ summary: 'Top địa chỉ giao hàng (theo GMV đơn tạo trong kỳ, trừ hủy/hoàn)' })
  @ApiOkResponse({ type: AnalyticsTopShippingCitiesResponseDto })
  @Get('top-shipping-cities')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getTopShippingCities(
    @Query() query: AnalyticsTopCitiesQueryDto,
  ): Promise<AnalyticsTopShippingCitiesResponseDto> {
    return await this.analyticsService.getTopShippingCities(query);
  }
}
