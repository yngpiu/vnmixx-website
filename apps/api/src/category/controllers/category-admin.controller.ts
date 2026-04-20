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
  Req,
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
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
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
      '`isActive` / `isSoftDeleted`: không gửi = không lọc; gửi true/false để lọc (cùng quy ước danh sách admin khác).',
  })
  @ApiOkResponse({ type: [CategoryAdminResponseDto] })
  @Get()
  async findAll(@Query() query: ListCategoriesQueryDto): Promise<CategoryAdminResponseDto[]> {
    return this.categoryService.findAll({
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.isSoftDeleted !== undefined ? { isSoftDeleted: query.isSoftDeleted } : {}),
    });
  }

  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiCreatedResponse({ type: CategoryAdminResponseDto })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Post()
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.create(dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.update(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiNoContentResponse({ description: 'Xóa danh mục thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({
    description: 'Không thể xóa danh mục vì còn danh mục con đang hoạt động.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  /**
   * Xóa mềm một danh mục.
   * Chỉ thành công nếu danh mục đó không có danh mục con nào đang hoạt động.
   */
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.categoryService.softDelete(id, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Khôi phục danh mục đã xóa' })
  @ApiOkResponse({ type: CategoryAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Patch(':id/restore')
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<CategoryAdminResponseDto> {
    return this.categoryService.restore(id, buildAuditRequestContext(request, user));
  }
}
