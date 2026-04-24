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
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/response.util';
import { AddCartItemDto, CartItemResponseDto, CartResponseDto, UpdateCartItemDto } from '../dto';
import { CartService } from '../services/cart.service';

// Quản lý giỏ hàng cá nhân cho khách hàng.
// Cung cấp các công cụ để khách hàng tùy chỉnh danh sách sản phẩm dự định mua.
@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(CartResponseDto, CartItemResponseDto)
@Controller('me/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Truy xuất nội dung giỏ hàng hiện tại của khách hàng.
  @ApiOperation({ summary: 'Lấy giỏ hàng của khách hàng hiện tại' })
  @ApiOkResponse({ schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartResponseDto) }) })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getCart(@CurrentUser() user: AuthenticatedUser): Promise<SuccessPayload<CartResponseDto>> {
    return ok(await this.cartService.getCart(user.id), 'Lấy giỏ hàng thành công.');
  }

  // Thêm sản phẩm mới hoặc tăng số lượng sản phẩm hiện có trong giỏ hàng.
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartItemResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy biến thể sản phẩm.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
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

  // Điều chỉnh số lượng sản phẩm trong giỏ hàng để phù hợp với nhu cầu thực tế.
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CartItemResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ.' })
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

  // Loại bỏ một sản phẩm cụ thể khỏi giỏ hàng.
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi giỏ hàng' })
  @ApiOkResponse({
    description: 'Xóa sản phẩm khỏi giỏ hàng thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa sản phẩm khỏi giỏ hàng thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục giỏ hàng.' })
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.cartService.removeItem(user.id, itemId);
    return okNoData('Xóa sản phẩm khỏi giỏ hàng thành công.');
  }

  // Xóa sạch toàn bộ sản phẩm để làm mới giỏ hàng.
  @ApiOperation({ summary: 'Xoá toàn bộ giỏ hàng' })
  @ApiOkResponse({
    description: 'Xóa toàn bộ giỏ hàng thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa toàn bộ giỏ hàng thành công.'),
  })
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async clearCart(@CurrentUser() user: AuthenticatedUser): Promise<SuccessPayload<null>> {
    await this.cartService.clearCart(user.id);
    return okNoData('Xóa toàn bộ giỏ hàng thành công.');
  }
}
