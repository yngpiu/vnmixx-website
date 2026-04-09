import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  CategoryAdminResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from '../dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/categories')
export class CategoryAdminController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({
    summary: 'Liệt kê danh mục',
    description:
      'Mặc định trả về danh mục đang hoạt động. Truyền `includeDeleted=true` để bao gồm bản ghi đã xóa mềm.',
  })
  @ApiOkResponse({ type: [CategoryAdminResponseDto] })
  @Get()
  async findAll(@Query() query: ListCategoriesQueryDto): Promise<CategoryAdminResponseDto[]> {
    return this.categoryService.findAll(query.includeDeleted);
  }

  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiCreatedResponse({ type: CategoryAdminResponseDto })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryAdminResponseDto> {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa mềm danh mục' })
  @ApiNoContentResponse({ description: 'Xóa danh mục thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({
    description: 'Không thể xóa danh mục vì còn danh mục con đang hoạt động.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.softDelete(id);
  }

  @ApiOperation({ summary: 'Khôi phục danh mục đã xóa mềm' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number): Promise<CategoryAdminResponseDto> {
    return this.categoryService.restore(id);
  }
}
