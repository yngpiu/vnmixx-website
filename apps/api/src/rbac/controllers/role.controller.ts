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
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@RequirePermissions('rbac.manage')
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: 'List all roles' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @Get()
  async findAll(): Promise<RoleResponseDto[]> {
    return this.roleService.findAll();
  }

  @ApiOperation({ summary: 'Get role detail with permissions' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleDetailResponseDto> {
    return this.roleService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiConflictResponse({ description: 'Role name is already in use.' })
  @Post()
  async create(@Body() dto: CreateRoleDto): Promise<RoleDetailResponseDto> {
    return this.roleService.create(dto);
  }

  @ApiOperation({ summary: 'Update role name/description' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @ApiConflictResponse({ description: 'Role name is already in use.' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a role' })
  @ApiNoContentResponse({ description: 'Role deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roleService.delete(id);
  }

  @ApiOperation({ summary: 'Sync permissions for a role (replace all)' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @Put(':id/permissions')
  async syncPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncPermissionsDto,
  ): Promise<RoleDetailResponseDto> {
    return this.roleService.syncPermissions(id, dto.permissionIds);
  }
}
