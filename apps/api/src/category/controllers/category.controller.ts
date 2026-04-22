import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CategoryDetailDto, CategoryResponseDto } from '../dto';
import { CategoryService } from '../services/category.service';

// Truy vấn danh mục sản phẩm cho phía Shop.
// Các API này công khai để khách hàng có thể tra cứu và điều hướng sản phẩm dễ dàng.
@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Liệt kê toàn bộ danh mục đang hoạt động dưới dạng phẳng để hiển thị trong menu hoặc các bộ lọc.
  @ApiOperation({ summary: 'Liệt kê tất cả danh mục đang hoạt động (dạng phẳng)' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findActiveFlat();
  }

  // Lấy chi tiết danh mục dựa trên Slug để hiển thị trang danh mục cụ thể kèm các danh mục con.
  @ApiOperation({ summary: 'Lấy chi tiết danh mục theo slug, bao gồm danh mục con trực tiếp' })
  @ApiOkResponse({ type: CategoryDetailDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Public()
  @Get(':slug')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findBySlug(@Param('slug') slug: string): Promise<CategoryDetailDto> {
    return this.categoryService.findBySlug(slug);
  }
}
