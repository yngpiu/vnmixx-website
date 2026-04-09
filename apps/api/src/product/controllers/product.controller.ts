import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { ListProductsQueryDto, ProductDetailResponseDto, ProductListResponseDto } from '../dto';
import { ProductService } from '../services/product.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Liệt kê sản phẩm có phân trang và bộ lọc' })
  @ApiOkResponse({ type: ProductListResponseDto })
  @Public()
  @Get()
  findAll(@Query() query: ListProductsQueryDto): Promise<ProductListResponseDto> {
    return this.productService.findPublicList(query);
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo slug' })
  @ApiOkResponse({ type: ProductDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<ProductDetailResponseDto> {
    return this.productService.findBySlug(slug);
  }
}
