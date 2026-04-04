import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { EmployeeRolesResponseDto, SyncEmployeeRolesDto } from '../dto';
import { EmployeeRoleService } from '../services/employee-role.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@RequirePermissions('rbac.manage')
@Controller('admin/employees')
export class EmployeeRoleController {
  constructor(private readonly employeeRoleService: EmployeeRoleService) {}

  @ApiOperation({ summary: 'Get roles assigned to an employee' })
  @ApiOkResponse({ type: EmployeeRolesResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Get(':id/roles')
  async findRoles(@Param('id', ParseIntPipe) id: number): Promise<EmployeeRolesResponseDto> {
    return this.employeeRoleService.findByEmployeeId(id);
  }

  @ApiOperation({ summary: 'Sync roles for an employee (replace all)' })
  @ApiOkResponse({ type: EmployeeRolesResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Put(':id/roles')
  async syncRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncEmployeeRolesDto,
  ): Promise<EmployeeRolesResponseDto> {
    return this.employeeRoleService.syncRoles(id, dto.roleIds);
  }
}
