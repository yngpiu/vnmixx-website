import { Injectable } from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { collectAuditLogActionCodesMatchingLabelSearch } from '../audit-log-action-label-search.util';

export interface CreateAuditLogInput {
  actorEmployeeId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  afterData?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  status: AuditLogStatus;
  errorMessage?: string;
}

export interface ListAuditLogsInput {
  page: number;
  limit: number;
  actorEmployeeIds?: number[];
  /** Exact match (multi). Takes precedence over {@link action} substring. */
  actions?: string[];
  /** Substring match on action code when {@link actions} and {@link search} are empty. */
  action?: string;
  /**
   * Tìm theo tên nhân viên (họ tên/email) hoặc nhãn tiếng Việt của hành động.
   * Chỉ áp dụng khi {@link actions} rỗng; ưu tiên hơn {@link action}.
   */
  search?: string;
  resourceTypes?: string[];
  resourceId?: string;
  status?: AuditLogStatus;
  from?: Date;
  to?: Date;
}

export interface PaginatedAuditLogsResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuditLogListItemView {
  id: number;
  actorEmployee: { id: number; fullName: string; email: string } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  beforeData: Prisma.JsonValue | null;
  afterData: Prisma.JsonValue | null;
  status: AuditLogStatus;
  errorMessage: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorEmployeeId: data.actorEmployeeId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        requestId: data.requestId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        beforeData: data.beforeData,
        afterData: data.afterData,
        status: data.status,
        errorMessage: data.errorMessage,
      },
    });
  }

  async findList(
    input: ListAuditLogsInput,
  ): Promise<PaginatedAuditLogsResult<AuditLogListItemView>> {
    const ands: Prisma.AuditLogWhereInput[] = [];

    if (input.actorEmployeeIds !== undefined && input.actorEmployeeIds.length > 0) {
      ands.push({ actorEmployeeId: { in: input.actorEmployeeIds } });
    }

    const hasExactActions = input.actions !== undefined && input.actions.length > 0;
    const searchTrimmed = input.search?.trim() ?? '';
    if (hasExactActions) {
      ands.push({ action: { in: input.actions } });
    } else if (searchTrimmed.length > 0) {
      const labelCodes = collectAuditLogActionCodesMatchingLabelSearch(searchTrimmed);
      ands.push({
        OR: [
          {
            actorEmployee: {
              OR: [
                { fullName: { contains: searchTrimmed } },
                { email: { contains: searchTrimmed } },
              ],
            },
          },
          ...(labelCodes.length > 0 ? [{ action: { in: labelCodes } }] : []),
        ],
      });
    } else if (input.action) {
      ands.push({ action: { contains: input.action } });
    }

    if (input.resourceTypes !== undefined && input.resourceTypes.length > 0) {
      ands.push({ resourceType: { in: input.resourceTypes } });
    }
    if (input.resourceId) {
      ands.push({ resourceId: { equals: input.resourceId } });
    }
    if (input.status) {
      ands.push({ status: input.status });
    }
    if (input.from || input.to) {
      ands.push({
        createdAt: {
          ...(input.from && { gte: input.from }),
          ...(input.to && { lte: input.to }),
        },
      });
    }

    const where: Prisma.AuditLogWhereInput = ands.length > 0 ? { AND: ands } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          requestId: true,
          ipAddress: true,
          userAgent: true,
          beforeData: true,
          afterData: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          actorEmployee: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: rows,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }
}
