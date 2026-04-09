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
  RoleDetailResponseDto,
  RoleResponseDto,
  SyncPermissionsDto,
  UpdateRoleDto,
} from '../dto';
import { RoleService } from '../services/role.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@RequirePermissions('rbac.manage')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả vai trò' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @Get()
  async findAll(): Promise<RoleResponseDto[]> {
    return this.roleService.findAll();
  }

  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm quyền' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetailResponseDto> {
    return this.roleService.findById(id);
  }

  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @Post()
  async create(@Body() dto: CreateRoleDto): Promise<RoleDetailResponseDto> {
    return this.roleService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật tên/mô tả vai trò' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiNoContentResponse({ description: 'Xóa vai trò thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roleService.delete(id);
  }

  @ApiOperation({ summary: 'Đồng bộ quyền cho vai trò (thay thế toàn bộ)' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @Put(':id/permissions')
  async syncPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncPermissionsDto,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.syncPermissions(id, dto.permissionIds);
  }
}
