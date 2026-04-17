import { Injectable, Logger } from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import {
  AuditLogRepository,
  type AuditLogListItemView,
  type ListAuditLogsInput,
  type PaginatedAuditLogsResult,
} from '../repositories/audit-log.repository';

const REDACTED_KEYS = new Set<string>([
  'password',
  'hashedpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
]);

export interface AuditLogWriteInput {
  actorEmployeeId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: unknown;
  afterData?: unknown;
  status: AuditLogStatus;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async write(input: AuditLogWriteInput): Promise<void> {
    try {
      await this.auditLogRepository.create({
        actorEmployeeId: input.actorEmployeeId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        beforeData: this.toJsonValue(input.beforeData),
        afterData: this.toJsonValue(input.afterData),
        status: input.status,
        errorMessage: input.errorMessage,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write audit log for ${input.action}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findList(
    input: ListAuditLogsInput,
  ): Promise<PaginatedAuditLogsResult<AuditLogListItemView>> {
    return this.auditLogRepository.findList(input);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull;
    }
    const sanitizedValue = this.sanitizeValue(value);
    return sanitizedValue as Prisma.InputJsonValue;
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitizeValue(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue).map(([key, currentValue]) => {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        return [key, '[REDACTED]'] as const;
      }
      return [key, this.sanitizeValue(currentValue)] as const;
    });
    return Object.fromEntries(entries);
  }
}
