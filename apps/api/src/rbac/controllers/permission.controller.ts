import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { PermissionResponseDto } from '../dto';
import { PermissionService } from '../services/permission.service';

// Controller quản lý danh sách các quyền (permissions) có sẵn trong hệ thống
// Cung cấp thông tin về tất cả các quyền để Admin có thể gán cho các vai trò
@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // Lấy toàn bộ danh sách quyền hạn hiện có để hiển thị trong giao diện quản lý vai trò
  @ApiOperation({ summary: 'Liệt kê tất cả quyền' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  @RequirePermissions('rbac.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionService.findAll();
  }
}
