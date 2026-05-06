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
import { ColorResponseDto } from '../../color/dto/color-response.dto';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { SizeResponseDto } from '../../size/dto/size-response.dto';
import {
  ListProductsQueryDto,
  ProductColorFacetsQueryDto,
  ProductDetailResponseDto,
  ProductListColorResponseDto,
  ProductListResponseDto,
  ProductListVariantResponseDto,
  ProductSizeFacetsQueryDto,
} from '../dto';
import { ProductService } from '../services/product.service';

// Cung cấp các API công khai cho khách hàng truy cập dữ liệu sản phẩm.
// Được tối ưu hóa qua cơ chế Cache để giảm tải cho database và tăng tốc độ phản hồi.
@ApiTags('Sản phẩm')
@ApiExtraModels(
  ColorResponseDto,
  SizeResponseDto,
  ProductListResponseDto,
  ProductListColorResponseDto,
  ProductListVariantResponseDto,
  ProductDetailResponseDto,
)
@Controller('products')
// API công khai để khách hàng tra cứu và xem chi tiết sản phẩm.
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Lấy danh sách sản phẩm với bộ lọc và phân trang, sử dụng cache để tối ưu hiệu năng.
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductListResponseDto) }),
  })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @Query() query: ListProductsQueryDto,
  ): Promise<SuccessPayload<ProductListResponseDto>> {
    return ok(
      await this.productService.findPublicList(query),
      'Lấy danh sách sản phẩm thành công.',
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách màu (facet) theo ngữ cảnh catalog',
    description:
      'Trả các màu còn xuất hiện trong biến thể active sau khi áp categorySlug, search, min/max price và sizeIds. Không truyền colorIds để facet không bị thu gọn sai khi khách đang chọn màu.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(ColorResponseDto) },
    }),
  })
  @Public()
  @Get('facet-colors')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async facetColors(
    @Query() query: ProductColorFacetsQueryDto,
  ): Promise<SuccessPayload<ColorResponseDto[]>> {
    return ok(await this.productService.findPublicColorFacets(query), 'Lấy facet màu thành công.');
  }

  @ApiOperation({
    summary: 'Lấy danh sách size (facet) theo ngữ cảnh catalog',
    description:
      'Trả các size còn xuất hiện trong biến thể active sau khi áp categorySlug, search, min/max price và colorIds. Không truyền sizeIds để facet không bị thu gọn sai khi khách đang chọn size.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(SizeResponseDto) },
    }),
  })
  @Public()
  @Get('facet-sizes')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async facetSizes(
    @Query() query: ProductSizeFacetsQueryDto,
  ): Promise<SuccessPayload<SizeResponseDto[]>> {
    return ok(await this.productService.findPublicSizeFacets(query), 'Lấy facet size thành công.');
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo slug' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get('slug/:slug')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findBySlug(@Param('slug') slug: string): Promise<SuccessPayload<ProductDetailResponseDto>> {
    return ok(await this.productService.findBySlug(slug), 'Lấy chi tiết sản phẩm thành công.');
  }
}
