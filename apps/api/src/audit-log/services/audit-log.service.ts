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

/**
 * AuditLogService: Dịch vụ ghi nhật ký hoạt động của nhân viên trên hệ thống.
 * Vai trò: Lưu vết mọi thay đổi quan trọng để phục vụ kiểm tra và bảo mật.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Ghi một bản ghi nhật ký mới.
   * Logic: Tự động lọc các thông tin nhạy cảm (password, token) trước khi lưu vào DB.
   * @param input Thông tin hoạt động cần ghi lại.
   */
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

  /**
   * Lấy danh sách nhật ký hoạt động có phân trang và bộ lọc.
   */
  async findList(
    input: ListAuditLogsInput,
  ): Promise<PaginatedAuditLogsResult<AuditLogListItemView>> {
    return this.auditLogRepository.findList(input);
  }

  /**
   * Chuyển đổi dữ liệu sang dạng JSON an toàn.
   */
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

  /**
   * Khử trùng dữ liệu nhạy cảm.
   * Logic: Duyệt qua các key của object, nếu trùng với danh sách REDACTED_KEYS thì thay thế bằng '[REDACTED]'.
   */
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
