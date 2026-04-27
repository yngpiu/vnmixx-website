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
import { InventoryLowStockQueryDto, InventoryLowStockResponseDto } from '../dto';
import { DashboardAdminService } from '../services/dashboard-admin.service';

@ApiTags('Inventory (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(InventoryLowStockResponseDto)
@Controller('admin/inventory')
export class InventoryAdminController {
  constructor(private readonly dashboardService: DashboardAdminService) {}

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm sắp hết hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryLowStockResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('low-stock')
  async getLowStock(
    @Query() query: InventoryLowStockQueryDto,
  ): Promise<SuccessPayload<InventoryLowStockResponseDto>> {
    return ok(
      await this.dashboardService.getLowStockProducts(query),
      'Lấy danh sách tồn kho sắp hết thành công.',
    );
  }
}
