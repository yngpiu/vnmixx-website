import { Controller, Get, Param } from '@nestjs/common';
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
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

// Truy vấn danh mục sản phẩm cho phía Shop.
// Các API này công khai để khách hàng có thể tra cứu và điều hướng sản phẩm dễ dàng.
@ApiTags('Categories')
@ApiExtraModels(CategoryResponseDto, CategoryDetailDto)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Liệt kê toàn bộ danh mục đang hoạt động dưới dạng phẳng để hiển thị trong menu hoặc các bộ lọc.
  @ApiOperation({ summary: 'Liệt kê tất cả danh mục đang hoạt động (dạng phẳng)' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(CategoryResponseDto) },
    }),
  })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(): Promise<SuccessPayload<CategoryResponseDto[]>> {
    return ok(await this.categoryService.findActiveFlat(), 'Lấy danh sách danh mục thành công.');
  }

  // Lấy chi tiết danh mục dựa trên Slug để hiển thị trang danh mục cụ thể kèm các danh mục con.
  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo slug, bao gồm danh mục con trực tiếp' })
  @ApiOkResponse({ schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CategoryDetailDto) }) })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Public()
  @Get(':slug')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findBySlug(@Param('slug') slug: string): Promise<SuccessPayload<CategoryDetailDto>> {
    return ok(await this.categoryService.findBySlug(slug), 'Lấy chi tiết danh mục thành công.');
  }
}
