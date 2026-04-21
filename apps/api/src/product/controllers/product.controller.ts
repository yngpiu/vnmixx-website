import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { ListProductsQueryDto, ProductDetailResponseDto, ProductListResponseDto } from '../dto';
import { ProductService } from '../services/product.service';

/**
 * ProductController: Cung cấp các API công khai cho khách hàng truy cập dữ liệu sản phẩm.
 * Các endpoint này không yêu cầu đăng nhập và được tối ưu hóa qua cơ chế Cache.
 */
@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * API liệt kê danh sách sản phẩm dành cho khách hàng.
   * Hỗ trợ lọc theo danh mục, màu sắc, kích thước, khoảng giá và phân trang.
   */
  @ApiOperation({ summary: 'Liệt kê sản phẩm có phân trang và bộ lọc' })
  @ApiOkResponse({ type: ProductListResponseDto })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(@Query() query: ListProductsQueryDto): Promise<ProductListResponseDto> {
    return this.productService.findPublicList(query);
  }

  /**
   * API lấy chi tiết sản phẩm dựa trên Slug (URL thân thiện).
   */
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo slug' })
  @ApiOkResponse({ type: ProductDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':slug')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findBySlug(@Param('slug') slug: string): Promise<ProductDetailResponseDto> {
    return this.productService.findBySlug(slug);
  }
}
