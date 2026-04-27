import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
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
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateInventoryVoucherDto,
  InventoryListQueryDto,
  InventoryListResponseDto,
  InventoryLowStockQueryDto,
  InventoryLowStockResponseDto,
  InventoryMovementListQueryDto,
  InventoryMovementListResponseDto,
  InventoryTransactionDto,
  InventoryVoucherDetailResponseDto,
  InventoryVoucherListResponseDto,
  ListInventoryVouchersQueryDto,
} from '../dto';
import { DashboardAdminService } from '../services/dashboard-admin.service';

@ApiTags('Inventory (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(
  InventoryLowStockResponseDto,
  InventoryListResponseDto,
  InventoryMovementListResponseDto,
  InventoryVoucherListResponseDto,
  InventoryVoucherDetailResponseDto,
)
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

  @ApiOperation({ summary: 'Lấy danh sách tồn kho theo SKU' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async listInventory(
    @Query() query: InventoryListQueryDto,
  ): Promise<SuccessPayload<InventoryListResponseDto>> {
    return ok(
      await this.dashboardService.listInventory(query),
      'Lấy danh sách kho hàng thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy lịch sử nhập xuất kho' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryMovementListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('movements')
  async listMovements(
    @Query() query: InventoryMovementListQueryDto,
  ): Promise<SuccessPayload<InventoryMovementListResponseDto>> {
    return ok(
      await this.dashboardService.listInventoryMovements(query),
      'Lấy lịch sử giao dịch kho thành công.',
    );
  }

  @ApiOperation({ summary: 'Nhập hàng vào kho' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ type: 'object', properties: { ok: { type: 'boolean' } } }),
  })
  @Post('transactions/import')
  async importStock(
    @Body() body: InventoryTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<{ ok: boolean }>> {
    return ok(await this.dashboardService.importStock(body, user.id), 'Nhập kho thành công.');
  }

  @ApiOperation({ summary: 'Xuất hàng khỏi kho' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ type: 'object', properties: { ok: { type: 'boolean' } } }),
  })
  @Post('transactions/export')
  async exportStock(
    @Body() body: InventoryTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<{ ok: boolean }>> {
    return ok(await this.dashboardService.exportStock(body, user.id), 'Xuất kho thành công.');
  }

  @ApiOperation({ summary: 'Tạo phiếu nhập/xuất kho (áp dụng tồn ngay)' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryVoucherDetailResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post('vouchers')
  async createVoucher(
    @Body() body: CreateInventoryVoucherDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<InventoryVoucherDetailResponseDto>> {
    return ok(
      await this.dashboardService.createInventoryVoucher(body, user.id),
      'Tạo phiếu kho thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy danh sách phiếu kho' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryVoucherListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('vouchers')
  async listVouchers(
    @Query() query: ListInventoryVouchersQueryDto,
  ): Promise<SuccessPayload<InventoryVoucherListResponseDto>> {
    return ok(
      await this.dashboardService.listInventoryVouchers(query),
      'Lấy danh sách phiếu kho thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy chi tiết phiếu kho' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(InventoryVoucherDetailResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('vouchers/:voucherId')
  async getVoucherById(
    @Param('voucherId', ParseIntPipe) voucherId: number,
  ): Promise<SuccessPayload<InventoryVoucherDetailResponseDto>> {
    return ok(
      await this.dashboardService.getInventoryVoucherDetail(voucherId),
      'Lấy chi tiết phiếu kho thành công.',
    );
  }
}
