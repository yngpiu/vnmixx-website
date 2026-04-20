import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CACHE_KEYS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import { CreateSizeDto, UpdateSizeDto } from '../dto';
import {
  PaginatedSizeList,
  SizeAdminView,
  SizeRepository,
  SizeView,
} from '../repositories/size.repository';

/**
 * SizeService: Quản lý thuộc tính kích thước của sản phẩm.
 * Vai trò: Cung cấp các nghiệp vụ liên quan đến kích thước (Size/Dimension), hỗ trợ tạo biến thể sản phẩm.
 */
@Injectable()
export class SizeService {
  constructor(
    private readonly repository: SizeRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách kích thước cho khách hàng.
   * Logic: Sử dụng Redis Cache để tăng tốc độ phản hồi.
   */
  findAllPublic(): Promise<SizeView[]> {
    return this.redis.getOrSet(CACHE_KEYS.SIZE_LIST, CACHE_TTL.SIZE, () =>
      this.repository.findAllPublic(),
    );
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  /**
   * Lấy tất cả kích thước (dành cho quản trị).
   */
  findAll(): Promise<SizeAdminView[]> {
    return this.repository.findAll();
  }

  /**
   * Tìm kiếm và phân trang danh sách kích thước.
   */
  findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedSizeList> {
    return this.repository.findList(params);
  }

  /**
   * Tạo kích thước mới.
   * Logic: Lưu vào DB, xóa cache và ghi log hệ thống.
   */
  async create(dto: CreateSizeDto, auditContext: AuditRequestContext = {}): Promise<SizeAdminView> {
    try {
      const result = await this.repository.create({
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.create',
        resourceType: 'size',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.create',
        resourceType: 'size',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  /**
   * Cập nhật kích thước.
   * Logic: Kiểm tra tồn tại, cập nhật DB, xóa cache và ghi log.
   */
  async update(
    id: number,
    dto: UpdateSizeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<SizeAdminView> {
    let beforeData: SizeAdminView | undefined;
    try {
      beforeData = await this.findByIdOrFail(id);
      const result = await this.repository.update(id, {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.update',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.update',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  /**
   * Xóa kích thước.
   * Logic: Kiểm tra ràng buộc (không thể xóa nếu kích thước đang được gán cho sản phẩm).
   */
  async remove(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(id);
    try {
      await this.findByIdOrFail(id);

      if (await this.repository.hasVariants(id)) {
        throw new ConflictException('Không thể xóa kích thước đang được biến thể sản phẩm sử dụng');
      }

      await this.repository.delete(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.delete',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.delete',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Xóa cache danh sách kích thước.
   */
  private async invalidateCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.SIZE_LIST);
  }

  /**
   * Tìm kích thước theo ID hoặc báo lỗi.
   */
  private async findByIdOrFail(id: number): Promise<SizeAdminView> {
    const size = await this.repository.findById(id);
    if (!size) throw new NotFoundException(`Không tìm thấy kích thước #${id}`);
    return size;
  }

  /**
   * Xử lý lỗi trùng lặp nhãn kích thước.
   */
  private handleUniqueViolation(err: unknown): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException('Kích thước với nhãn này đã tồn tại');
    }
  }
}
