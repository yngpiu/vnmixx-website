import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
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
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@ApiExtraModels(CategoryResponseDto, CategoryDetailDto)
@Controller('categories')
// Truy vấn danh mục sản phẩm cho phía Shop.
// Các API này công khai để khách hàng có thể tra cứu và điều hướng sản phẩm dễ dàng.
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Lấy toàn bộ danh mục đang hoạt động dạng phẳng để hiển thị trong menu hoặc bộ lọc.
  @ApiOperation({ summary: 'Lấy danh sách danh mục đang hoạt động dạng phẳng' })
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

  // Lấy chi tiết danh mục theo ID để hiển thị trang danh mục cụ thể kèm các danh mục con.
  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo ID, bao gồm danh mục con trực tiếp' })
  @ApiOkResponse({ schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CategoryDetailDto) }) })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Public()
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<CategoryDetailDto>> {
    return ok(await this.categoryService.findPublicById(id), 'Lấy chi tiết danh mục thành công.');
  }
}
