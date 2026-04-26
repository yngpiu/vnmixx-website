import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import {
  getPrismaErrorTargets,
  isPrismaErrorCode,
  isPrismaKnownRequestError,
} from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import { COLOR_CACHE_KEYS, COLOR_CACHE_TTL } from '../color.cache';
import { CreateColorDto, UpdateColorDto } from '../dto';
import {
  ColorAdminView,
  ColorRepository,
  ColorView,
  PaginatedColorList,
} from '../repositories/color.repository';

// Quản lý thuộc tính màu sắc của sản phẩm để phân loại và tạo biến thể.
@Injectable()
export class ColorService {
  constructor(
    private readonly repository: ColorRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  // Lấy danh sách màu sắc và lưu cache để tái sử dụng cho khách hàng.
  findAllPublic(): Promise<ColorView[]> {
    return this.redis.getOrSet(COLOR_CACHE_KEYS.COLOR_LIST, COLOR_CACHE_TTL.COLOR, () =>
      this.repository.findAllPublic(),
    );
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  // Lấy tất cả màu sắc dành cho quản trị.
  findAll(): Promise<ColorAdminView[]> {
    return this.repository.findAll();
  }

  // Tìm kiếm và phân trang danh sách màu sắc.
  findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedColorList> {
    return this.repository.findList(params);
  }

  // Tạo màu sắc mới, lưu vào DB, xóa cache và ghi Audit Log.
  async create(
    dto: CreateColorDto,
    auditContext: AuditRequestContext = {},
  ): Promise<ColorAdminView> {
    try {
      const result = await this.repository.create({ name: dto.name, hexCode: dto.hexCode });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.create',
        resourceType: 'color',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.create',
        resourceType: 'color',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  // Kiểm tra tồn tại, cập nhật DB, xóa cache và ghi Audit Log.
  async update(
    id: number,
    dto: UpdateColorDto,
    auditContext: AuditRequestContext = {},
  ): Promise<ColorAdminView> {
    let beforeData: ColorAdminView | undefined;
    try {
      beforeData = await this.findByIdOrFail(id);
      const result = await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.hexCode !== undefined && { hexCode: dto.hexCode }),
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.update',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.update',
        resourceType: 'color',
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

  // Kiểm tra ràng buộc và xóa màu sắc khỏi DB, xóa cache và ghi Audit Log.
  async remove(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(id);
    try {
      await this.findByIdOrFail(id);

      const [hasVariants, hasImages] = await Promise.all([
        this.repository.hasVariants(id),
        this.repository.hasImages(id),
      ]);

      if (hasVariants || hasImages) {
        throw new ConflictException(
          'Không thể xóa màu sắc đang được biến thể hoặc ảnh sản phẩm sử dụng',
        );
      }

      await this.repository.delete(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.delete',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'color.delete',
        resourceType: 'color',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Tìm màu sắc theo ID hoặc ném lỗi nếu không tồn tại.
  private async findByIdOrFail(id: number): Promise<ColorAdminView> {
    const color = await this.repository.findById(id);
    if (!color) throw new NotFoundException(`Không tìm thấy màu sắc #${id}`);
    return color;
  }

  // Xóa cache danh sách màu sắc khi có thay đổi dữ liệu.
  private async invalidateCache(): Promise<void> {
    await this.redis.del(COLOR_CACHE_KEYS.COLOR_LIST);
  }

  // Xử lý lỗi vi phạm ràng buộc duy nhất từ Prisma.
  private handleUniqueViolation(err: unknown): void {
    if (isPrismaErrorCode(err, 'P2002') && isPrismaKnownRequestError(err)) {
      const target = getPrismaErrorTargets(err).join(', ') || 'field';
      throw new ConflictException(`Màu sắc với ${target} này đã tồn tại`);
    }
  }
}
