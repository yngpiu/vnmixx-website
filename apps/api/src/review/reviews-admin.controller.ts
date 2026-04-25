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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequireUserType } from '../auth/decorators';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
  ok,
  okNoData,
  type SuccessPayload,
} from '../common/utils/response.util';
import {
  AdminReviewDetailResponseDto,
  AdminReviewsListResponseDto,
  ListAdminReviewsQueryDto,
  UpdateReviewVisibilityDto,
} from './dto/admin-review.dto';
import { ReviewService } from './review.service';

// Tiếp nhận các yêu cầu quản lý đánh giá từ phía nhân viên.
// Cho phép liệt kê, xem chi tiết, ẩn/hiện hoặc xóa các đánh giá sản phẩm trên hệ thống để đảm bảo chất lượng nội dung hiển thị.
@ApiTags('Reviews (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(AdminReviewsListResponseDto, AdminReviewDetailResponseDto)
@Controller('admin/reviews')
export class ReviewsAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  // Lấy danh sách đánh giá toàn hệ thống để kiểm duyệt nội dung.
  @ApiOperation({ summary: 'Danh sách review có phân trang và bộ lọc.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewsListResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getReviews(
    @Query() query: ListAdminReviewsQueryDto,
  ): Promise<SuccessPayload<AdminReviewsListResponseDto>> {
    return ok(await this.reviewService.getAdminReviews(query), 'Lấy danh sách review thành công.');
  }

  // Xem chi tiết đánh giá để hiểu rõ phản hồi của khách hàng.
  @ApiOperation({ summary: 'Chi tiết review.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getReviewDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<AdminReviewDetailResponseDto>> {
    return ok(await this.reviewService.getAdminReviewDetail(id), 'Lấy chi tiết review thành công.');
  }

  // Thay đổi trạng thái hiển thị (Ẩn/Hiện) khi review vi phạm chính sách hoặc đã được xử lý.
  @ApiOperation({ summary: 'Cập nhật trạng thái review (ẩn/hiện).' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AdminReviewDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Patch(':id/visibility')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async updateVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ): Promise<SuccessPayload<AdminReviewDetailResponseDto>> {
    return ok(
      await this.reviewService.updateAdminReviewStatus(id, dto.status),
      'Cập nhật trạng thái review thành công.',
    );
  }

  // Xóa vĩnh viễn đánh giá trong trường hợp nội dung không phù hợp hoặc là spam.
  @ApiOperation({ summary: 'Xóa review.' })
  @ApiOkResponse({
    description: 'Xóa review thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa review thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy review.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async deleteReview(@Param('id', ParseIntPipe) id: number): Promise<SuccessPayload<null>> {
    await this.reviewService.deleteAdminReview(id);
    return okNoData('Xóa review thành công.');
  }
}
