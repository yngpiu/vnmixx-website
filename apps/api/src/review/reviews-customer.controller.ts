import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/interfaces';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ReviewService } from './review.service';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('products/:productId/reviews')
export class ReviewsCustomerController {
  constructor(private readonly reviewService: ReviewService) {}
  @ApiOperation({ summary: 'Tạo review sản phẩm sau khi đã nhận hàng và thanh toán thành công' })
  @ApiCreatedResponse({ description: 'Tạo review thành công.' })
  @ApiBadRequestResponse({ description: 'Chưa đủ điều kiện review hoặc dữ liệu không hợp lệ.' })
  @ApiConflictResponse({ description: 'Bạn đã review sản phẩm này.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Post()
  createProductReview(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateProductReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewService.createProductReview(user.id, productId, dto);
  }
}
