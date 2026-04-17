import { Injectable } from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
  /** Substring match when {@link actions} is empty. */
  action?: string;
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
    const actionWhere: Prisma.StringFilter | undefined =
      input.actions !== undefined && input.actions.length > 0
        ? { in: input.actions }
        : input.action
          ? { contains: input.action }
          : undefined;
    const where: Prisma.AuditLogWhereInput = {
      ...(input.actorEmployeeIds !== undefined &&
        input.actorEmployeeIds.length > 0 && {
          actorEmployeeId: { in: input.actorEmployeeIds },
        }),
      ...(actionWhere && { action: actionWhere }),
      ...(input.resourceTypes !== undefined &&
        input.resourceTypes.length > 0 && {
          resourceType: { in: input.resourceTypes },
        }),
      ...(input.resourceId && { resourceId: { equals: input.resourceId } }),
      ...(input.status && { status: input.status }),
      ...((input.from || input.to) && {
        createdAt: {
          ...(input.from && { gte: input.from }),
          ...(input.to && { lte: input.to }),
        },
      }),
    };

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
