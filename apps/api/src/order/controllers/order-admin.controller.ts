import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  ConfirmOrderShipmentDto,
  ListAdminOrdersQueryDto,
  OrderAdminDetailResponseDto,
  OrderAdminListResponseDto,
} from '../dto';
import { OrderAdminService } from '../services/order-admin.service';

/**
 * OrderAdminController: Tiếp nhận các yêu cầu quản lý đơn hàng từ phía nhân viên.
 * Vai trò: Cung cấp các công cụ để liệt kê, xác nhận, tạo vận đơn và xử lý hủy đơn/thanh toán.
 */
@ApiTags('Orders (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/orders')
export class OrderAdminController {
  constructor(private readonly orderAdminService: OrderAdminService) {}

  /**
   * Lấy toàn bộ đơn hàng của hệ thống kèm các bộ lọc tìm kiếm.
   */
  @ApiOperation({ summary: 'Liệt kê tất cả đơn hàng (quản trị)' })
  @ApiOkResponse({ type: OrderAdminListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(@Query() query: ListAdminOrdersQueryDto): Promise<OrderAdminListResponseDto> {
    return this.orderAdminService.findAllOrders(query);
  }

  /**
   * Xem chi tiết đầy đủ của một đơn hàng bao gồm cả thông tin khách hàng và lịch sử.
   */
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng (quản trị)' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Get(':orderCode')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findByCode(@Param('orderCode') orderCode: string): Promise<OrderAdminDetailResponseDto> {
    return await this.orderAdminService.findOrderByCode(orderCode);
  }

  /**
   * Xác nhận đơn hàng, cho phép cập nhật kích thước kiện hàng và tự động tạo mã vận đơn GHN.
   */
  @ApiOperation({ summary: 'Xác nhận đơn hàng và tạo vận đơn GHN' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/confirm')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async confirmOrder(
    @Param('orderCode') orderCode: string,
    @Body() body: ConfirmOrderShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.confirmOrder(
      orderCode,
      body,
      buildAuditRequestContext(request, user),
    );
  }

  /**
   * Hủy đơn hàng từ phía quản trị viên.
   */
  @ApiOperation({ summary: 'Hủy đơn hàng (admin)' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép hủy.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/cancel')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async cancelOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.cancelOrder(orderCode, buildAuditRequestContext(request, user));
  }

  /**
   * Xác nhận thủ công việc khách đã chuyển khoản thành công.
   */
  @ApiOperation({ summary: 'Xác nhận thanh toán chuyển khoản' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không phải chuyển khoản hoặc đã xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/confirm-payment')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async confirmPayment(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.confirmPayment(
      orderCode,
      buildAuditRequestContext(request, user),
    );
  }
}
