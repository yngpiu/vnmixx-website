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
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
  UpdateReviewVisibilityDto,
} from '../dto';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews (Admin)')
@ApiBearerAuth('access-token')
@ApiExtraModels(AdminReviewsListResponseDto, AdminReviewDetailResponseDto)
@Controller('admin/reviews')
@RequireUserType('EMPLOYEE')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
// Controller quản lý đánh giá sản phẩm dành cho quản trị viên.
// Cho phép duyệt danh sách, xem chi tiết và kiểm duyệt hiển thị đánh giá.
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Lấy danh sách đánh giá có phân trang và lọc theo điều kiện.
  @ApiOperation({ summary: 'Lấy danh sách đánh giá sản phẩm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewsListResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async getReviews(
    @Query() query: ListAdminReviewsQueryDto,
  ): Promise<SuccessPayload<AdminReviewsListResponseDto>> {
    return ok(
      await this.reviewService.getAdminReviews(query),
      'Lấy danh sách đánh giá thành công.',
    );
  }

  // Lấy thông tin chi tiết một đánh giá cụ thể.
  @ApiOperation({ summary: 'Lấy chi tiết đánh giá sản phẩm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id')
  async getReviewDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<AdminReviewDetailResponseDto>> {
    return ok(
      await this.reviewService.getAdminReviewDetail(id),
      'Lấy chi tiết đánh giá thành công.',
    );
  }

  // Cập nhật trạng thái hiển thị (VISIBLE/HIDDEN) của đánh giá.
  @ApiOperation({ summary: 'Cập nhật trạng thái hiển thị đánh giá' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ): Promise<SuccessPayload<AdminReviewDetailResponseDto>> {
    return ok(
      await this.reviewService.updateAdminReviewStatus(id, dto.status),
      'Cập nhật trạng thái đánh giá thành công.',
    );
  }

  // Ẩn đánh giá khỏi giao diện khách hàng nhưng vẫn giữ bản ghi cho đối soát.
  @ApiOperation({ summary: 'Ẩn đánh giá sản phẩm' })
  @ApiNoContentResponse({
    description: 'Ẩn đánh giá thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.reviewService.hideAdminReview(id);
  }
}
