import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  CreateOrderDto,
  ListMyOrdersQueryDto,
  OrderDetailResponseDto,
  OrderListResponseDto,
} from '../dto';
import { OrderService } from '../services/order.service';

// Tiếp nhận các yêu cầu liên quan đến đơn hàng từ phía khách hàng.
// Điều hướng yêu cầu đặt hàng, hủy đơn và xem lịch sử mua hàng cá nhân.
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Khởi tạo đơn hàng mới từ giỏ hàng hiện tại của khách hàng.
  @ApiOperation({ summary: 'Đặt hàng (checkout từ giỏ hàng)' })
  @ApiCreatedResponse({ type: OrderDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Giỏ hàng trống hoặc tồn kho không đủ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async placeOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponseDto> {
    return this.orderService.placeOrder(user.id, dto);
  }

  // Truy xuất toàn bộ lịch sử mua sắm để khách hàng theo dõi các đơn hàng cũ.
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của tôi' })
  @ApiOkResponse({ type: OrderListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findMyOrders(
    @Query() query: ListMyOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderListResponseDto> {
    return this.orderService.findMyOrders(user.id, query);
  }

  // Xem chi tiết một đơn hàng cụ thể để biết trạng thái vận chuyển và thanh toán.
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng' })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @Get(':orderCode')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findMyOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponseDto> {
    return this.orderService.findMyOrderByCode(user.id, orderCode);
  }

  // Cho phép khách hàng tự hủy đơn khi đơn vẫn đang trong trạng thái chờ xử lý.
  @ApiOperation({ summary: 'Hủy đơn hàng (chỉ khi trạng thái PENDING)' })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép hủy.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @HttpCode(HttpStatus.OK)
  @Post(':orderCode/cancel')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async cancelMyOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponseDto> {
    return this.orderService.cancelMyOrder(user.id, orderCode);
  }
}
