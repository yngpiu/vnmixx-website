import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  DashboardCategoryRevenueQueryDto,
  DashboardCategoryRevenueResponseDto,
  DashboardDateRangeQueryDto,
  DashboardKpisResponseDto,
  DashboardOrderStatusDistributionResponseDto,
  DashboardRecentOrdersQueryDto,
  DashboardRecentOrdersResponseDto,
  DashboardRevenueTrendResponseDto,
  DashboardSummaryMetricsResponseDto,
  DashboardTopProductsQueryDto,
  DashboardTopProductsResponseDto,
  DashboardTrendQueryDto,
} from '../dto';
import { DashboardAdminService } from '../services/dashboard-admin.service';

@ApiTags('Dashboard (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(
  DashboardKpisResponseDto,
  DashboardRevenueTrendResponseDto,
  DashboardOrderStatusDistributionResponseDto,
  DashboardTopProductsResponseDto,
  DashboardCategoryRevenueResponseDto,
  DashboardSummaryMetricsResponseDto,
  DashboardRecentOrdersResponseDto,
)
@Controller('admin/dashboard')
export class DashboardAdminController {
  constructor(private readonly dashboardService: DashboardAdminService) {}

  @ApiOperation({ summary: 'Lấy 4 KPI chính cho dashboard' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(DashboardKpisResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('kpis')
  async getKpis(
    @Query() query: DashboardDateRangeQueryDto,
  ): Promise<SuccessPayload<DashboardKpisResponseDto>> {
    return ok(await this.dashboardService.getKpis(query), 'Lấy KPI dashboard thành công.');
  }

  @ApiOperation({ summary: 'Lấy chuỗi dữ liệu doanh thu theo thời gian' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(DashboardRevenueTrendResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('revenue-trend')
  async getRevenueTrend(
    @Query() query: DashboardTrendQueryDto,
  ): Promise<SuccessPayload<DashboardRevenueTrendResponseDto>> {
    return ok(
      await this.dashboardService.getRevenueTrend(query),
      'Lấy biểu đồ doanh thu dashboard thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy phân bổ trạng thái đơn hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      $ref: getSchemaPath(DashboardOrderStatusDistributionResponseDto),
    }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('order-status-distribution')
  async getOrderStatusDistribution(
    @Query() query: DashboardDateRangeQueryDto,
  ): Promise<SuccessPayload<DashboardOrderStatusDistributionResponseDto>> {
    return ok(
      await this.dashboardService.getOrderStatusDistribution(query),
      'Lấy phân bổ trạng thái đơn hàng thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm bán chạy' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(DashboardTopProductsResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('top-products')
  async getTopProducts(
    @Query() query: DashboardTopProductsQueryDto,
  ): Promise<SuccessPayload<DashboardTopProductsResponseDto>> {
    return ok(await this.dashboardService.getTopProducts(query), 'Lấy top sản phẩm thành công.');
  }

  @ApiOperation({ summary: 'Lấy doanh thu theo danh mục' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      $ref: getSchemaPath(DashboardCategoryRevenueResponseDto),
    }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('category-revenue')
  async getCategoryRevenue(
    @Query() query: DashboardCategoryRevenueQueryDto,
  ): Promise<SuccessPayload<DashboardCategoryRevenueResponseDto>> {
    return ok(
      await this.dashboardService.getCategoryRevenue(query),
      'Lấy doanh thu theo danh mục thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy dải chỉ số tổng hợp cuối dashboard' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(DashboardSummaryMetricsResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('summary-metrics')
  async getSummaryMetrics(
    @Query() query: DashboardDateRangeQueryDto,
  ): Promise<SuccessPayload<DashboardSummaryMetricsResponseDto>> {
    return ok(
      await this.dashboardService.getSummaryMetrics(query),
      'Lấy dải chỉ số tổng hợp thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy danh sách đơn hàng mới nhất cho widget' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(DashboardRecentOrdersResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('recent-orders')
  async getRecentOrders(
    @Query() query: DashboardRecentOrdersQueryDto,
  ): Promise<SuccessPayload<DashboardRecentOrdersResponseDto>> {
    return ok(
      await this.dashboardService.getRecentOrders(query),
      'Lấy danh sách đơn hàng mới nhất thành công.',
    );
  }
}
