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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
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

/**
 * ReviewsAdminController: Tiếp nhận các yêu cầu quản lý đánh giá từ phía nhân viên.
 * Vai trò: Cho phép liệt kê, xem chi tiết, ẩn/hiện hoặc xóa các đánh giá sản phẩm trên hệ thống.
 */
@ApiTags('Reviews (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/reviews')
export class ReviewsAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Lấy danh sách đánh giá toàn hệ thống với bộ lọc và phân trang.
   */
  @ApiOperation({ summary: 'Danh sách review có phân trang và bộ lọc.' })
  @ApiOkResponse({ type: AdminReviewsListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getReviews(@Query() query: ListAdminReviewsQueryDto): Promise<AdminReviewsListResponseDto> {
    return this.reviewService.getAdminReviews(query);
  }

  /**
   * Xem chi tiết một đánh giá cụ thể.
   */
  @ApiOperation({ summary: 'Chi tiết review.' })
  @ApiOkResponse({ type: AdminReviewDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getReviewDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminReviewDetailResponseDto> {
    return await this.reviewService.getAdminReviewDetail(id);
  }

  /**
   * Thay đổi trạng thái hiển thị của đánh giá (Ẩn/Hiện).
   */
  @ApiOperation({ summary: 'Cập nhật trạng thái review (ẩn/hiện).' })
  @ApiOkResponse({ type: AdminReviewDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Patch(':id/visibility')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ): Promise<AdminReviewDetailResponseDto> {
    return this.reviewService.updateAdminReviewStatus(id, dto.status);
  }

  /**
   * Xóa vĩnh viễn một đánh giá khỏi hệ thống.
   */
  @ApiOperation({ summary: 'Xóa review.' })
  @ApiNoContentResponse({ description: 'Xóa review thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async deleteReview(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reviewService.deleteAdminReview(id);
  }
}
