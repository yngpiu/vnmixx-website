import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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
  PublicShopProductReviewsBySlugResponseDto as PublicShopProductReviewsResponseDto,
} from '../dto';
import { ReviewService } from '../services/review.service';

@ApiTags('Reviews')
@ApiExtraModels(PublicShopProductReviewsResponseDto, PublicShopProductRatingBreakdownDto)
@Controller('products')
export class PublicShopProductReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({
    summary: 'Danh sách đánh giá công khai theo slug sản phẩm (kèm trung bình và tổng số)',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      $ref: getSchemaPath(PublicShopProductReviewsResponseDto),
    }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get('slug/:slug/reviews')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async listByProductSlug(
    @Param('slug') slug: string,
    @Query() query: ListPublicShopProductReviewsQueryDto,
  ): Promise<SuccessPayload<PublicShopProductReviewsResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return ok(
      await this.reviewService.listPublicReviewsByProductSlug(slug, page, limit),
      'Lấy danh sách đánh giá thành công.',
    );
  }

  @ApiOperation({
    summary: 'Danh sách đánh giá công khai theo ID sản phẩm (kèm trung bình và tổng số)',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      $ref: getSchemaPath(PublicShopProductReviewsResponseDto),
    }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':id/reviews')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async listByProductId(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListPublicShopProductReviewsQueryDto,
  ): Promise<SuccessPayload<PublicShopProductReviewsResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return ok(
      await this.reviewService.listPublicReviewsByProductId(id, page, limit),
      'Lấy danh sách đánh giá thành công.',
    );
  }
}
