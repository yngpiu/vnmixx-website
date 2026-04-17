import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { PermissionResponseDto } from '../dto';
import { PermissionService } from '../services/permission.service';

// Controller quản lý danh sách các quyền (permissions) trong hệ thống
@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // API lấy toàn bộ danh sách các quyền hiện có
  @ApiOperation({ summary: 'Liệt kê tất cả quyền' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  @RequirePermissions('rbac.read')
  @Get()
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionService.findAll();
  }
}
