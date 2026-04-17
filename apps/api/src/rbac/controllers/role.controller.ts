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

// Controller quản lý các vai trò (roles) và gán quyền cho vai trò
@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // API lấy danh sách vai trò có phân trang, tìm kiếm và sắp xếp
  @ApiOperation({
    summary: 'Liệt kê vai trò',
    description: 'Danh sách phân trang; tìm theo tên hoặc mô tả qua tham số search.',
  })
  @ApiOkResponse({ type: RoleListResponseDto })
  @RequirePermissions('rbac.read')
  @Get()
  async findList(@Query() query: ListRolesQueryDto): Promise<RoleListResponseDto> {
    return this.roleService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // API lấy thông tin chi tiết của một vai trò kèm các quyền đã gán
  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @RequirePermissions('rbac.read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetailResponseDto> {
    return this.roleService.findById(id);
  }

  // API tạo vai trò mới và gán danh sách quyền ban đầu
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc ID quyền không tồn tại.' })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.create')
  @Post()
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.create(dto, buildAuditRequestContext(request, user));
  }

  // API cập nhật tên, mô tả và thay đổi danh sách quyền của vai trò
  @ApiOperation({ summary: 'Cập nhật vai trò và quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ, ID quyền không tồn tại, hoặc cố gắng sửa vai trò hệ thống.',
  })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.update')
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.update(id, dto, buildAuditRequestContext(request, user));
  }

  // API xóa hoàn toàn một vai trò khỏi hệ thống
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiNoContentResponse({ description: 'Xóa vai trò thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({ description: 'Không được phép xóa vai trò hệ thống.' })
  @RequirePermissions('rbac.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.roleService.delete(id, buildAuditRequestContext(request, user));
  }
}
