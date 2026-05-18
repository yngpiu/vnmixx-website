import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { ok, type SuccessPayload } from '../../common/utils/response.util';
import { CreateCustomerReviewDto } from '../dto';
import { ReviewService } from '../services/review.service';

@ApiTags('Customer Reviews')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/reviews')
export class CustomerReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Tạo đánh giá sản phẩm' })
  @ApiCreatedResponse({
    description: 'Đánh giá đã được tạo thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ hoặc đã đánh giá sản phẩm này.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  async createReview(
    @Body() dto: CreateCustomerReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<{ id: number }>> {
    const result = await this.reviewService.createCustomerReview(user.id, {
      productId: dto.productId,
      orderItemId: dto.orderItemId,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
    });
    return ok(result, 'Đánh giá sản phẩm thành công.');
  }
}
