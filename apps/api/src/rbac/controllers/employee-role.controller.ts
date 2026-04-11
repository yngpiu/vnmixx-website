import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { EmployeeRolesResponseDto, SyncEmployeeRolesDto } from '../dto';
import { EmployeeRoleService } from '../services/employee-role.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/employees')
export class EmployeeRoleController {
  constructor(private readonly employeeRoleService: EmployeeRoleService) {}

  @ApiOperation({ summary: 'Lấy vai trò được gán cho nhân viên' })
  @ApiOkResponse({ type: EmployeeRolesResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @RequirePermissions('rbac.read')
  @Get(':id/roles')
  async findRoles(@Param('id', ParseIntPipe) id: number): Promise<EmployeeRolesResponseDto> {
    return this.employeeRoleService.findByEmployeeId(id);
  }

  @ApiOperation({ summary: 'Đồng bộ vai trò cho nhân viên (thay thế toàn bộ)' })
  @ApiOkResponse({ type: EmployeeRolesResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên.' })
  @RequirePermissions('rbac.update')
  @Put(':id/roles')
  async syncRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncEmployeeRolesDto,
  ): Promise<EmployeeRolesResponseDto> {
    return this.employeeRoleService.syncRoles(id, dto.roleIds);
  }
}
