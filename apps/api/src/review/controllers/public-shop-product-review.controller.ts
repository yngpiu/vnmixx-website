import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  ListPublicShopProductReviewsQueryDto,
  PublicShopProductRatingBreakdownDto,
  PublicShopProductReviewsBySlugResponseDto,
} from '../dto';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews')
@ApiExtraModels(PublicShopProductReviewsBySlugResponseDto, PublicShopProductRatingBreakdownDto)
@Controller('products')
export class PublicShopProductReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({
    summary: 'Danh sách đánh giá công khai theo slug sản phẩm (kèm trung bình và tổng số)',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      $ref: getSchemaPath(PublicShopProductReviewsBySlugResponseDto),
    }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':slug/reviews')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async listByProductSlug(
    @Param('slug') slug: string,
    @Query() query: ListPublicShopProductReviewsQueryDto,
  ): Promise<SuccessPayload<PublicShopProductReviewsBySlugResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return ok(
      await this.reviewService.listPublicReviewsByProductSlug(slug, page, limit),
      'Lấy danh sách đánh giá thành công.',
    );
  }
}
