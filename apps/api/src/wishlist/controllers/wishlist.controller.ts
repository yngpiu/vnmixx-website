import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { WishlistItemResponseDto } from '../dto';
import { WishlistService } from '../services/wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'Lấy danh sách yêu thích của khách hàng hiện tại' })
  @ApiOkResponse({ type: [WishlistItemResponseDto] })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<WishlistItemResponseDto[]> {
    return this.wishlistService.findAll(user.id);
  }

  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  @ApiCreatedResponse({ description: 'Thêm vào danh sách yêu thích thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Sản phẩm đã có trong danh sách yêu thích.' })
  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.wishlistService.add(user.id, productId);
  }

  @ApiOperation({ summary: 'Xoá sản phẩm khỏi danh sách yêu thích' })
  @ApiNoContentResponse({ description: 'Xoá khỏi danh sách yêu thích thành công.' })
  @ApiNotFoundResponse({ description: 'Sản phẩm không có trong danh sách yêu thích.' })
  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.wishlistService.remove(user.id, productId);
  }
}
