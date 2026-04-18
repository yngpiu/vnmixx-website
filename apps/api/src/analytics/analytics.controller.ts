import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
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
    summary: 'Tổng quan thống kê đơn hàng (GMV, hoàn thành, funnel thanh toán, đơn cần xử lý)',
    description:
      'GMV kỳ = SUM(total) đơn tạo trong kỳ (trừ CANCELLED/RETURNED). Doanh thu hoàn thành = SUM(total) đơn DELIVERED có updatedAt trong kỳ. Đơn chờ xử lý / đang giao = đếm theo createdAt trong kỳ. AOV hoàn thành = completedRevenue / ordersCompletedCount.',
  })
  @ApiOkResponse({ type: AnalyticsOverviewResponseDto })
  @Get('overview')
  async getOverview(
    @Query() query: AnalyticsDateRangeQueryDto,
  ): Promise<AnalyticsOverviewResponseDto> {
    return this.analyticsService.getOverview(query);
  }

  @ApiOperation({
    summary:
      'Chuỗi thời gian theo ngày (GMV/đơn tạo theo createdAt; hoàn thành/hủy theo updatedAt)',
  })
  @ApiOkResponse({ type: AnalyticsTimeseriesResponseDto })
  @Get('timeseries')
  async getTimeseries(
    @Query() query: AnalyticsTimeseriesQueryDto,
  ): Promise<AnalyticsTimeseriesResponseDto> {
    return this.analyticsService.getTimeseries(query);
  }

  @ApiOperation({ summary: 'Top địa chỉ giao hàng (theo GMV đơn tạo trong kỳ, trừ hủy/hoàn)' })
  @ApiOkResponse({ type: AnalyticsTopShippingCitiesResponseDto })
  @Get('top-shipping-cities')
  async getTopShippingCities(
    @Query() query: AnalyticsTopCitiesQueryDto,
  ): Promise<AnalyticsTopShippingCitiesResponseDto> {
    return this.analyticsService.getTopShippingCities(query);
  }
}
