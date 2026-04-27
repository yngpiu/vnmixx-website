import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { CreateProductReviewDto } from '../dto';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('products/:productId/reviews')
@RequireUserType('CUSTOMER')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
// Controller quản lý đánh giá sản phẩm từ phía khách hàng.
// Cho phép khách hàng gửi đánh giá sau khi đã mua và nhận hàng thành công.
export class CustomerReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Ghi nhận đánh giá của khách hàng cho một sản phẩm cụ thể.
  @ApiOperation({ summary: 'Tạo review sản phẩm sau khi đã nhận hàng và thanh toán thành công' })
  @ApiCreatedResponse({
    description: 'Tạo review thành công.',
    schema: buildNullDataSuccessResponseSchema('Tạo review thành công.'),
  })
  @ApiBadRequestResponse({ description: 'Chưa đủ điều kiện review hoặc dữ liệu không hợp lệ.' })
  @ApiConflictResponse({ description: 'Bạn đã review variant này trong lần mua này.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  async createProductReview(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateProductReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.reviewService.createProductReview(user.id, productId, dto);
    return okNoData('Tạo review thành công.');
  }
}
