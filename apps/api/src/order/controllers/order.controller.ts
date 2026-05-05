import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateOrderDto,
  ListMyOrdersQueryDto,
  OrderDetailResponseDto,
  OrderListResponseDto,
} from '../dto';
import { OrderService } from '../services/order.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@ApiExtraModels(OrderDetailResponseDto, OrderListResponseDto)
@RequireUserType('CUSTOMER')
@Controller('me/orders')
// Tiếp nhận các yêu cầu liên quan đến đơn hàng từ phía khách hàng.
// Điều hướng yêu cầu đặt hàng, hủy đơn và xem lịch sử mua hàng cá nhân.
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Khởi tạo đơn hàng mới từ giỏ hàng hiện tại của khách hàng.
  @ApiOperation({ summary: 'Đặt hàng (checkout từ giỏ hàng)' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Giỏ hàng trống hoặc tồn kho không đủ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  async placeOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<OrderDetailResponseDto>> {
    return ok(await this.orderService.placeOrder(user.id, dto), 'Đặt hàng thành công.');
  }

  // Truy xuất toàn bộ lịch sử mua sắm để khách hàng theo dõi các đơn hàng cũ.
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của tôi' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async findMyOrders(
    @Query() query: ListMyOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<OrderListResponseDto>> {
    return ok(
      await this.orderService.findMyOrders(user.id, query),
      'Lấy danh sách đơn hàng thành công.',
    );
  }

  // Xem chi tiết một đơn hàng cụ thể để biết trạng thái vận chuyển và thanh toán.
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':orderCode')
  async findMyOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<OrderDetailResponseDto>> {
    return ok(
      await this.orderService.findMyOrderByCode(user.id, orderCode),
      'Lấy chi tiết đơn hàng thành công.',
    );
  }

  // Cho phép khách hàng tự hủy đơn khi đơn vẫn đang trong trạng thái chờ thanh toán hoặc chờ xác nhận.
  @ApiOperation({ summary: 'Hủy đơn hàng (chỉ khi chờ thanh toán hoặc chờ xác nhận)' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(OrderDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Đơn hàng không ở trạng thái cho phép hủy.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @HttpCode(HttpStatus.OK)
  @Post(':orderCode/cancel')
  async cancelMyOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<OrderDetailResponseDto>> {
    return ok(
      await this.orderService.cancelMyOrder(user.id, orderCode),
      'Hủy đơn hàng thành công.',
    );
  }
}
