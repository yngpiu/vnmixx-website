import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
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
  AddCartItemDto,
  CartItemColorDto,
  CartItemProductDto,
  CartItemResponseDto,
  CartItemSizeDto,
  CartItemVariantDto,
  CartResponseDto,
  UpdateCartItemDto,
} from '../dto';
import { CartService } from '../services/cart.service';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(
  CartResponseDto,
  CartItemResponseDto,
  CartItemVariantDto,
  CartItemProductDto,
  CartItemColorDto,
  CartItemSizeDto,
)
@Controller('me/cart')
// API quản lý giỏ hàng dành cho khách hàng đã đăng nhập.
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Lấy toàn bộ thông tin giỏ hàng và các sản phẩm bên trong.
  @ApiOperation({ summary: 'Lấy giỏ hàng của khách hàng hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getCart(@CurrentUser() user: AuthenticatedUser): Promise<SuccessPayload<CartResponseDto>> {
    return ok(await this.cartService.getCart(user.id), 'Lấy giỏ hàng thành công.');
  }

  // Thêm một biến thể sản phẩm vào giỏ hàng với số lượng chỉ định.
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartItemResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể sản phẩm.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc tồn kho không đủ.' })
  @Post('items')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<CartItemResponseDto>> {
    return ok(
      await this.cartService.addItem(user.id, dto),
      'Thêm sản phẩm vào giỏ hàng thành công.',
    );
  }

  // Thay đổi số lượng của một sản phẩm đã có trong giỏ hàng.
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartItemResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc tồn kho không đủ.' })
  @Patch('items/:itemId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<CartItemResponseDto>> {
    return ok(
      await this.cartService.updateItem(user.id, itemId, dto),
      'Cập nhật giỏ hàng thành công.',
    );
  }

  // Xóa bỏ một mục sản phẩm cụ thể khỏi giỏ hàng.
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi giỏ hàng' })
  @ApiNoContentResponse({
    description: 'Xóa sản phẩm khỏi giỏ hàng thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.cartService.removeItem(user.id, itemId);
  }

  // Làm sạch toàn bộ giỏ hàng của khách hàng.
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  @ApiNoContentResponse({
    description: 'Xóa toàn bộ giỏ hàng thành công.',
  })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.cartService.clearCart(user.id);
  }
}
