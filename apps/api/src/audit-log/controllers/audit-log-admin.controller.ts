import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { AuditLogListResponseDto, ListAuditLogsQueryDto } from '../dto';
import { AuditLogService } from '../services/audit-log.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(AuditLogListResponseDto)
@Controller('admin/audit-logs')
// API quản trị dành cho nhân viên để tra cứu nhật ký hoạt động của hệ thống.
export class AuditLogAdminController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // Truy vấn danh sách lịch sử thay đổi dữ liệu của nhân viên kèm phân trang.
  @ApiOperation({ summary: 'Lấy danh sách nhật ký hoạt động' })
  @ApiOkResponse({
    description: 'Lấy danh sách nhật ký thành công.',
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AuditLogListResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Tham số truy vấn không hợp lệ.' })
  @RequirePermissions('audit.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findList(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<SuccessPayload<AuditLogListResponseDto>> {
    const actorIds: number[] = [...(query.actorEmployeeIds ?? [])];
    if (query.actorEmployeeId !== undefined) {
      actorIds.push(query.actorEmployeeId);
    }
    const actorEmployeeIds = [...new Set(actorIds)];
    const rTypes: string[] = [...(query.resourceTypes ?? [])];
    if (query.resourceType) {
      rTypes.push(query.resourceType);
    }
    const resourceTypes = [...new Set(rTypes)];
    const actionCodes = [...new Set([...(query.actions ?? [])])];
    const search = query.search?.trim();
    return ok(
      await this.auditLogService.findList({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        actorEmployeeIds: actorEmployeeIds.length > 0 ? actorEmployeeIds : undefined,
        actions: actionCodes.length > 0 ? actionCodes : undefined,
        action: search ? undefined : query.action,
        search: search && search.length > 0 ? search : undefined,
        resourceTypes: resourceTypes.length > 0 ? resourceTypes : undefined,
        resourceId: query.resourceId,
        status: query.status,
        from: query.from,
        to: query.to,
      }),
      'Lấy danh sách nhật ký hoạt động thành công.',
    );
  }
}
