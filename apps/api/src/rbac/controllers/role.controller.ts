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
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import {
  CreateRoleDto,
  ListRolesQueryDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
  UpdateRoleDto,
} from '../dto';
import { RoleService } from '../services/role.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

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

  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @RequirePermissions('rbac.read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetailResponseDto> {
    return this.roleService.findById(id);
  }

  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.create')
  @Post()
  async create(@Body() dto: CreateRoleDto): Promise<RoleDetailResponseDto> {
    return this.roleService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật vai trò và quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.update')
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiNoContentResponse({ description: 'Xóa vai trò thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @RequirePermissions('rbac.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roleService.delete(id);
  }
}
