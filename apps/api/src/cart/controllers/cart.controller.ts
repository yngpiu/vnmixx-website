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

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Lấy giỏ hàng của khách hàng hiện tại' })
  @ApiOkResponse({ type: CartResponseDto })
  @Get()
  async getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  @ApiCreatedResponse({ type: CartItemResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể sản phẩm.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
  @Post('items')
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartItemResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  @ApiOkResponse({ type: CartItemResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartItemResponseDto> {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @ApiOperation({ summary: 'Xoá sản phẩm khỏi giỏ hàng' })
  @ApiNoContentResponse({ description: 'Xoá mục giỏ hàng thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.cartService.removeItem(user.id, itemId);
  }

  @ApiOperation({ summary: 'Xoá toàn bộ giỏ hàng' })
  @ApiNoContentResponse({ description: 'Xoá giỏ hàng thành công.' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.cartService.clearCart(user.id);
  }
}
