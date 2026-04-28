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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
  ok,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
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
@ApiExtraModels(CategoryAdminResponseDto)
@Controller('admin/categories')
// API quản trị danh mục sản phẩm dành cho nhân viên.
export class CategoryAdminController {
  constructor(private readonly categoryService: CategoryService) {}

  // Lấy danh sách danh mục với các bộ lọc tùy chọn.
  @ApiOperation({
    summary: 'Lấy danh sách danh mục',
    description:
      '`isActive` / `isSoftDeleted`: không gửi = không lọc; gửi true/false để lọc (cùng quy ước danh sách admin khác).',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(CategoryAdminResponseDto) },
    }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @Query() query: ListCategoriesQueryDto,
  ): Promise<SuccessPayload<CategoryAdminResponseDto[]>> {
    return ok(
      await this.categoryService.findAll({
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.isSoftDeleted !== undefined ? { isSoftDeleted: query.isSoftDeleted } : {}),
      }),
      'Lấy danh sách danh mục thành công.',
    );
  }

  // Tạo mới một danh mục sản phẩm.
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CategoryAdminResponseDto) }),
  })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<CategoryAdminResponseDto>> {
    return ok(
      await this.categoryService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo danh mục thành công.',
    );
  }

  // Cập nhật thông tin danh mục theo ID.
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CategoryAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({ description: 'Slug danh mục đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<CategoryAdminResponseDto>> {
    return ok(
      await this.categoryService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật danh mục thành công.',
    );
  }

  // Xóa mềm một danh mục, chỉ thành công nếu không có danh mục con đang hoạt động.
  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiOkResponse({
    description: 'Xóa danh mục thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa danh mục thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @ApiConflictResponse({
    description: 'Không thể xóa danh mục vì còn danh mục con đang hoạt động.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.categoryService.softDelete(id, buildAuditRequestContext(request, user));
    return okNoData('Xóa danh mục thành công.');
  }

  // Khôi phục một danh mục đã bị xóa mềm.
  @ApiOperation({ summary: 'Khôi phục danh mục đã xóa' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(CategoryAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục.' })
  @Patch(':id/restore')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<CategoryAdminResponseDto>> {
    return ok(
      await this.categoryService.restore(id, buildAuditRequestContext(request, user)),
      'Khôi phục danh mục thành công.',
    );
  }
}
