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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireUserType } from '../auth/decorators';
import {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
  UpdateReviewVisibilityDto,
} from './dto/admin-review.dto';
import { ReviewService } from './review.service';

@ApiTags('Reviews (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/reviews')
export class ReviewsAdminController {
  constructor(private readonly reviewService: ReviewService) {}
  @ApiOperation({ summary: 'Danh sách review có phân trang và bộ lọc.' })
  @ApiOkResponse({ type: AdminReviewsListResponseDto })
  @Get()
  async getReviews(@Query() query: ListAdminReviewsQueryDto): Promise<AdminReviewsListResponseDto> {
    return this.reviewService.getAdminReviews(query);
  }
  @ApiOperation({ summary: 'Chi tiết review.' })
  @ApiOkResponse({ type: AdminReviewDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Get(':id')
  async getReviewDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminReviewDetailResponseDto> {
    return this.reviewService.getAdminReviewDetail(id);
  }
  @ApiOperation({ summary: 'Cập nhật trạng thái review (ẩn/hiện).' })
  @ApiOkResponse({ type: AdminReviewDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ): Promise<AdminReviewDetailResponseDto> {
    return this.reviewService.updateAdminReviewStatus(id, dto.status);
  }
  @ApiOperation({ summary: 'Xóa review.' })
  @ApiNoContentResponse({ description: 'Xóa review thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reviewService.deleteAdminReview(id);
  }
}
