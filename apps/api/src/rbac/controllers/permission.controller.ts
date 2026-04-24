import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { buildSuccessResponseSchema } from '../../common/swagger/response-schema.util';
import { ok, type SuccessPayload } from '../../common/utils/response.util';
import { PermissionResponseDto } from '../dto';
import { PermissionService } from '../services/permission.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(PermissionResponseDto)
@Controller('admin/permissions')
// API quản trị danh sách quyền có thể gán cho vai trò.
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // Trả về toàn bộ quyền đang có trong hệ thống.
  @ApiOperation({ summary: 'Liệt kê tất cả quyền' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(PermissionResponseDto) },
    }),
  })
  @RequirePermissions('rbac.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(): Promise<SuccessPayload<PermissionResponseDto[]>> {
    return ok(await this.permissionService.findAll(), 'Lấy danh sách quyền thành công.');
  }
}
