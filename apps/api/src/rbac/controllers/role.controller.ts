import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequirePermissions, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  CreateRoleDto,
  ListRolesQueryDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
  UpdateRoleDto,
} from '../dto';
import { RoleService } from '../services/role.service';

// Controller quản lý các vai trò (roles) và gán quyền (permissions) cho vai trò
// Cung cấp các thao tác CRUD cho vai trò và cập nhật danh sách quyền hạn đi kèm
@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Lấy danh sách vai trò có phân trang, hỗ trợ tìm kiếm theo tên hoặc mô tả
  @ApiOperation({
    summary: 'Liệt kê vai trò',
    description: 'Danh sách phân trang; tìm theo tên hoặc mô tả qua tham số search.',
  })
  @ApiOkResponse({ type: RoleListResponseDto })
  @RequirePermissions('rbac.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findList(@Query() query: ListRolesQueryDto): Promise<RoleListResponseDto> {
    return this.roleService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // Lấy thông tin chi tiết của một vai trò, bao gồm danh sách các quyền đã được gán
  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @RequirePermissions('rbac.read')
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetailResponseDto> {
    return this.roleService.findById(id);
  }

  // Tạo vai trò mới và thiết lập danh sách quyền ban đầu cho vai trò đó
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc ID quyền không tồn tại.' })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.create')
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.create(dto, buildAuditRequestContext(request, user));
  }

  // Cập nhật thông tin vai trò và thay đổi (đồng bộ) lại danh sách quyền hạn
  @ApiOperation({ summary: 'Cập nhật vai trò và quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ, ID quyền không tồn tại, hoặc cố gắng sửa vai trò hệ thống.',
  })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.update')
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.update(id, dto, buildAuditRequestContext(request, user));
  }

  // Xóa một vai trò khỏi hệ thống (lưu ý: không cho phép xóa các vai trò mặc định của hệ thống)
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiNoContentResponse({ description: 'Xóa vai trò thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({ description: 'Không được phép xóa vai trò hệ thống.' })
  @RequirePermissions('rbac.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.roleService.delete(id, buildAuditRequestContext(request, user));
  }
}
