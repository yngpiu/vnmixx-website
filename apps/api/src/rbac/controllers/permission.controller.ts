import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { PermissionResponseDto } from '../dto';
import { PermissionService } from '../services/permission.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@RequirePermissions('rbac.manage')
@Controller('admin/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @ApiOperation({ summary: 'List all permissions' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  @Get()
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionService.findAll();
  }
}
