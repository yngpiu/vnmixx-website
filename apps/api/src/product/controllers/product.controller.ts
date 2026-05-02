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
  ListProductsQueryDto,
  ProductDetailResponseDto,
  ProductListColorResponseDto,
  ProductListResponseDto,
} from '../dto';
import { ProductService } from '../services/product.service';

// Cung cấp các API công khai cho khách hàng truy cập dữ liệu sản phẩm.
// Được tối ưu hóa qua cơ chế Cache để giảm tải cho database và tăng tốc độ phản hồi.
@ApiTags('Sản phẩm')
@ApiExtraModels(ProductListResponseDto, ProductListColorResponseDto, ProductDetailResponseDto)
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

  // Truy vấn chi tiết một sản phẩm theo ID.
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo ID' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ProductDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  @Public()
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<ProductDetailResponseDto>> {
    return ok(await this.productService.findPublicById(id), 'Lấy chi tiết sản phẩm thành công.');
  }
}
