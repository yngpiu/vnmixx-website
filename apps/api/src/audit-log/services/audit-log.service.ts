import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

// AuditLogService: Dịch vụ ghi nhật ký hoạt động của nhân viên trên hệ thống.
// Vai trò: Lưu vết mọi thay đổi quan trọng để phục vụ kiểm tra và bảo mật.
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  // Ghi một bản ghi nhật ký mới.
  // Logic: Tự động lọc các thông tin nhạy cảm (password, token) trước khi lưu vào DB để đảm bảo an toàn.
  async write(input: AuditLogWriteInput): Promise<void> {
    try {
      // 1. Thực hiện tạo bản ghi nhật ký mới trong cơ sở dữ liệu
      // Dữ liệu trước (before) và sau (after) khi thay đổi sẽ được khử trùng thông tin nhạy cảm (sanitized)
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
      // 2. Ghi lỗi vào console nếu không thể lưu log vào DB
      this.logger.error(
        `Failed to write audit log for ${input.action}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Nếu thao tác chính đã thất bại (status FAILED) thì không ném lỗi ra ngoài để tránh làm treo ứng dụng
      if (input.status === AuditLogStatus.FAILED) {
        return;
      }
      throw new InternalServerErrorException('Không thể ghi nhật ký hệ thống');
    }
  }

  // Lấy danh sách nhật ký hoạt động có phân trang và bộ lọc.
  async findList(
    input: ListAuditLogsInput,
  ): Promise<PaginatedAuditLogsResult<AuditLogListItemView>> {
    return this.auditLogRepository.findList(input);
  }

  // Chuyển đổi dữ liệu sang dạng JSON an toàn trước khi lưu.
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

  // Khử trùng dữ liệu nhạy cảm (Data Redaction).
  // Logic: Duyệt qua các key của object, nếu trùng với danh sách REDACTED_KEYS thì thay thế bằng '[REDACTED]'.
  private sanitizeValue(value: unknown): unknown {
    // 1. Nếu là mảng, thực hiện khử trùng cho từng phần tử bên trong
    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitizeValue(item));
    }
    // 2. Nếu không phải object hoặc là null, trả về giá trị nguyên bản
    if (!value || typeof value !== 'object') {
      return value;
    }
    // 3. Xử lý khử trùng cho các thuộc tính của object
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue).map(([key, currentValue]) => {
      // Nếu key nằm trong danh sách nhạy cảm (password, token...), thực hiện ẩn thông tin
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        return [key, '[REDACTED]'] as const;
      }
      // Đệ quy để khử trùng các object lồng nhau
      return [key, this.sanitizeValue(currentValue)] as const;
    });
    return Object.fromEntries(entries);
  }
}
