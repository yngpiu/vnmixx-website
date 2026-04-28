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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
  ok,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { WishlistItemResponseDto } from '../dto';
import { WishlistService } from '../services/wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(WishlistItemResponseDto)
@Controller('me/wishlist')
// Controller quản lý danh sách yêu thích cá nhân của khách hàng.
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // Lấy danh sách các sản phẩm mà khách hàng đã thêm vào mục yêu thích.
  @ApiOperation({ summary: 'Lấy danh sách yêu thích của khách hàng hiện tại' })
  @ApiOkResponse({
    description: 'Lấy danh sách yêu thích thành công.',
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(WishlistItemResponseDto) },
    }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<WishlistItemResponseDto[]>> {
    return ok(await this.wishlistService.findAll(user.id), 'Lấy danh sách yêu thích thành công.');
  }

  // Thêm một sản phẩm mới vào danh sách yêu thích để theo dõi sau.
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  @ApiCreatedResponse({
    description: 'Thêm vào danh sách yêu thích thành công.',
    schema: buildNullDataSuccessResponseSchema('Thêm vào danh sách yêu thích thành công.'),
  })
  @ApiBadRequestResponse({ description: 'Yêu cầu không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiConflictResponse({ description: 'Sản phẩm đã có trong danh sách yêu thích.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.wishlistService.add(user.id, productId);
    return okNoData('Thêm vào danh sách yêu thích thành công.');
  }

  // Loại bỏ sản phẩm khỏi danh sách yêu thích khi không còn nhu cầu.
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiOkResponse({
    description: 'Xóa khỏi danh sách yêu thích thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa khỏi danh sách yêu thích thành công.'),
  })
  @ApiBadRequestResponse({ description: 'Yêu cầu không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Sản phẩm không có trong danh sách yêu thích.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.wishlistService.remove(user.id, productId);
    return okNoData('Xóa khỏi danh sách yêu thích thành công.');
  }
}
