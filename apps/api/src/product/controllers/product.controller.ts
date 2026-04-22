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

// Cung cấp các API công khai cho khách hàng truy cập dữ liệu sản phẩm.
// Được tối ưu hóa qua cơ chế Cache để giảm tải cho database và tăng tốc độ phản hồi.
@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Liệt kê sản phẩm cho khách hàng với khả năng lọc linh hoạt (danh mục, màu, size, giá).
  @ApiOperation({ summary: 'Liệt kê sản phẩm có phân trang và bộ lọc' })
  @ApiOkResponse({ type: ProductListResponseDto })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(@Query() query: ListProductsQueryDto): Promise<ProductListResponseDto> {
    return this.productService.findPublicList(query);
  }

  // Lấy chi tiết sản phẩm qua Slug để phục vụ hiển thị trên trang chi tiết sản phẩm.
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
