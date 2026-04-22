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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { AddCartItemDto, CartItemResponseDto, CartResponseDto, UpdateCartItemDto } from '../dto';
import { CartService } from '../services/cart.service';

// Quản lý giỏ hàng cá nhân cho khách hàng.
// Cung cấp các công cụ để khách hàng tùy chỉnh danh sách sản phẩm dự định mua.
@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Truy xuất nội dung giỏ hàng hiện tại của khách hàng.
  @ApiOperation({ summary: 'Lấy giỏ hàng của khách hàng hiện tại' })
  @ApiOkResponse({ type: CartResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  // Thêm sản phẩm mới hoặc tăng số lượng sản phẩm hiện có trong giỏ hàng.
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  @ApiCreatedResponse({ type: CartItemResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể sản phẩm.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
  @Post('items')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartItemResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  // Điều chỉnh số lượng sản phẩm trong giỏ hàng để phù hợp với nhu cầu thực tế.
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  @ApiOkResponse({ type: CartItemResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
  @Patch('items/:itemId')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartItemResponseDto> {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  // Loại bỏ một sản phẩm cụ thể khỏi giỏ hàng.
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi giỏ hàng' })
  @ApiNoContentResponse({ description: 'Xoá mục giỏ hàng thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.cartService.removeItem(user.id, itemId);
  }

  // Xóa sạch toàn bộ sản phẩm để làm mới giỏ hàng.
  @ApiOperation({ summary: 'Xoá toàn bộ giỏ hàng' })
  @ApiNoContentResponse({ description: 'Xoá giỏ hàng thành công.' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.cartService.clearCart(user.id);
  }
}
