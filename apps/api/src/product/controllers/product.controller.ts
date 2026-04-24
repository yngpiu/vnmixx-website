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
import { buildSuccessResponseSchema } from '../../common/swagger/response-schema.util';
import { ok, type SuccessPayload } from '../../common/utils/success-response.util';
import { ListProductsQueryDto, ProductDetailResponseDto, ProductListResponseDto } from '../dto';
import { ProductService } from '../services/product.service';

// Cung cấp các API công khai cho khách hàng truy cập dữ liệu sản phẩm.
// Được tối ưu hóa qua cơ chế Cache để giảm tải cho database và tăng tốc độ phản hồi.
@ApiTags('Products')
@ApiExtraModels(ProductListResponseDto, ProductDetailResponseDto)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Liệt kê sản phẩm cho khách hàng với khả năng lọc linh hoạt (danh mục, màu, size, giá).
  @ApiOperation({ summary: 'Liệt kê sản phẩm có phân trang và bộ lọc' })
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

  // Lấy chi tiết sản phẩm qua Slug để phục vụ hiển thị trên trang chi tiết sản phẩm.
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo slug' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':slug')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findBySlug(@Param('slug') slug: string): Promise<SuccessPayload<ProductDetailResponseDto>> {
    return ok(await this.productService.findBySlug(slug), 'Lấy chi tiết sản phẩm thành công.');
  }
}
