import { Controller, Get, Query } from '@nestjs/common';
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
import { AuditLogListResponseDto, ListAuditLogsQueryDto } from '../dto';
import { AuditLogService } from '../services/audit-log.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/audit-logs')
export class AuditLogAdminController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @ApiOperation({ summary: 'Liệt kê audit logs' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @RequirePermissions('audit.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findList(@Query() query: ListAuditLogsQueryDto) {
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
    return this.auditLogService.findList({
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
    });
  }
}
