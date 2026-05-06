import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  ListAdminOrdersQueryDto,
  OrderAdminDetailResponseDto,
  OrderAdminListResponseDto,
  UpdateOrderStatusDto,
} from '../dto';
import { OrderAdminService } from '../services/order-admin.service';

@ApiTags('Orders (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(OrderAdminListResponseDto, OrderAdminDetailResponseDto)
@Controller('admin/orders')
// Tiếp nhận các yêu cầu quản lý đơn hàng từ phía nhân viên.
// Cung cấp các công cụ vận hành: xác nhận đơn, tạo vận đơn GHN, và xử lý các tình huống hủy đơn/thanh toán.
export class OrderAdminController {
  constructor(private readonly orderAdminService: OrderAdminService) {}

  // Truy xuất danh sách đơn hàng toàn hệ thống để nhân viên xử lý theo luồng vận hành.
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async findAll(
    @Query() query: ListAdminOrdersQueryDto,
  ): Promise<SuccessPayload<OrderAdminListResponseDto>> {
    return ok(
      await this.orderAdminService.findAllOrders(query),
      'Lấy danh sách đơn hàng thành công.',
    );
  }

  // Lấy chi tiết đơn hàng kèm lịch sử tác động để phục vụ việc đối soát và chăm sóc khách hàng.
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':orderCode')
  async findByCode(
    @Param('orderCode') orderCode: string,
  ): Promise<SuccessPayload<OrderAdminDetailResponseDto>> {
    return ok(
      await this.orderAdminService.findOrderByCode(orderCode),
      'Lấy chi tiết đơn hàng thành công.',
    );
  }

  // Xác nhận đơn hàng và đẩy thông tin sang đơn vị vận chuyển (GHN) để bắt đầu quy trình giao hàng.
  @ApiOperation({ summary: 'Xác nhận đơn hàng và tạo vận đơn GHN' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Patch(':orderCode/confirm')
  async confirmOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<OrderAdminDetailResponseDto>> {
    return ok(
      await this.orderAdminService.confirmOrder(orderCode, buildAuditRequestContext(request, user)),
      'Xác nhận đơn hàng thành công.',
    );
  }

  // Hủy đơn hàng từ phía hệ thống khi phát hiện sai sót hoặc theo yêu cầu đặc biệt từ admin.
  @ApiOperation({ summary: 'Hủy đơn hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép hủy.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Patch(':orderCode/cancel')
  async cancelOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<OrderAdminDetailResponseDto>> {
    return ok(
      await this.orderAdminService.cancelOrder(orderCode, buildAuditRequestContext(request, user)),
      'Hủy đơn hàng thành công.',
    );
  }

  // Xác nhận thanh toán cho các đơn hàng chuyển khoản sau khi đã đối soát ngân hàng thành công.
  @ApiOperation({ summary: 'Xác nhận thanh toán chuyển khoản' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Đơn hàng không phải chuyển khoản hoặc đã xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Patch(':orderCode/confirm-payment')
  async confirmPayment(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<OrderAdminDetailResponseDto>> {
    return ok(
      await this.orderAdminService.confirmPayment(
        orderCode,
        buildAuditRequestContext(request, user),
      ),
      'Xác nhận thanh toán thành công.',
    );
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng thủ công (tạm thời)' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderAdminDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Trạng thái không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Patch(':orderCode/status')
  async updateOrderStatus(
    @Param('orderCode') orderCode: string,
    @Body('status') status: UpdateOrderStatusDto['status'],
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<OrderAdminDetailResponseDto>> {
    return ok(
      await this.orderAdminService.updateOrderStatus(
        orderCode,
        status,
        buildAuditRequestContext(request, user),
      ),
      'Cập nhật trạng thái đơn hàng thành công.',
    );
  }
}
