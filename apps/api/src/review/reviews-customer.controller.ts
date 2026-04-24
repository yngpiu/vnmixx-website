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
import { CurrentUser, RequireUserType } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/interfaces';
import { buildNullDataSuccessResponseSchema } from '../common/swagger/response-schema.util';
import { okNoData, type SuccessPayload } from '../common/utils/success-response.util';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ReviewService } from './review.service';

// Tiếp nhận các đánh giá sản phẩm từ phía khách hàng.
// Đảm bảo phản hồi của người dùng được thu thập để cải thiện chất lượng dịch vụ và sản phẩm.
@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('products/:productId/reviews')
export class ReviewsCustomerController {
  constructor(private readonly reviewService: ReviewService) {}

  // Ghi nhận đánh giá của khách hàng sau khi đã mua và nhận hàng thành công.
  @ApiOperation({ summary: 'Tạo review sản phẩm sau khi đã nhận hàng và thanh toán thành công' })
  @ApiCreatedResponse({
    description: 'Tạo review thành công.',
    schema: buildNullDataSuccessResponseSchema('Tạo review thành công.'),
  })
  @ApiBadRequestResponse({ description: 'Chưa đủ điều kiện review hoặc dữ liệu không hợp lệ.' })
  @ApiConflictResponse({ description: 'Bạn đã review sản phẩm này.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  createProductReview(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateProductReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    return (async () => {
      await this.reviewService.createProductReview(user.id, productId, dto);
      return okNoData('Tạo review thành công.');
    })();
  }
}
