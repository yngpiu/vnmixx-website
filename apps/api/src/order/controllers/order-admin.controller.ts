import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  ListAdminOrdersQueryDto,
  OrderAdminDetailResponseDto,
  OrderAdminListResponseDto,
} from '../dto';
import { OrderAdminService } from '../services/order-admin.service';

@ApiTags('Orders (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/orders')
export class OrderAdminController {
  constructor(private readonly orderAdminService: OrderAdminService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả đơn hàng (quản trị)' })
  @ApiOkResponse({ type: OrderAdminListResponseDto })
  @Get()
  async findAll(@Query() query: ListAdminOrdersQueryDto): Promise<OrderAdminListResponseDto> {
    return this.orderAdminService.findAllOrders(query);
  }

  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng (quản trị)' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Get(':orderCode')
  async findByCode(@Param('orderCode') orderCode: string): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.findOrderByCode(orderCode);
  }

  @ApiOperation({ summary: 'Xác nhận đơn hàng và tạo vận đơn GHN' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/confirm')
  async confirmOrder(@Param('orderCode') orderCode: string): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.confirmOrder(orderCode);
  }

  @ApiOperation({ summary: 'Hủy đơn hàng (admin)' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép hủy.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/cancel')
  async cancelOrder(@Param('orderCode') orderCode: string): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.cancelOrder(orderCode);
  }

  @ApiOperation({ summary: 'Xác nhận thanh toán chuyển khoản' })
  @ApiOkResponse({ type: OrderAdminDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không phải chuyển khoản hoặc đã xác nhận.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Patch(':orderCode/confirm-payment')
  async confirmPayment(
    @Param('orderCode') orderCode: string,
  ): Promise<OrderAdminDetailResponseDto> {
    return this.orderAdminService.confirmPayment(orderCode);
  }
}
