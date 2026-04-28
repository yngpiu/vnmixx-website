import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import { CreateSizeDto, UpdateSizeDto } from '../dto';
import {
  PaginatedSizeList,
  SizeAdminView,
  SizeRepository,
  SizeView,
} from '../repositories/size.repository';
import { SIZE_CACHE_KEYS, SIZE_CACHE_TTL } from '../size.cache';

// Quản lý thuộc tính kích thước sản phẩm (Size/Dimension).
// Phục vụ việc phân loại và tạo các biến thể sản phẩm trong hệ thống e-commerce.
@Injectable()
export class SizeService {
  constructor(
    private readonly repository: SizeRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  // Lấy danh sách kích thước hiển thị cho khách hàng, sử dụng Redis Cache để tối ưu hiệu năng.
  findAllPublic(): Promise<SizeView[]> {
    return this.redis.getOrSet(SIZE_CACHE_KEYS.SIZE_LIST, SIZE_CACHE_TTL.SIZE, () =>
      this.repository.findAllPublic(),
    );
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  // Lấy đầy đủ thông tin kích thước cho quản trị viên.
  findAll(): Promise<SizeAdminView[]> {
    return this.repository.findAll();
  }

  // Tìm kiếm và phân trang kích thước phục vụ giao diện quản lý của admin.
  findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedSizeList> {
    return this.repository.findList(params);
  }

  // Tạo mới một loại kích thước để bổ sung vào danh mục hệ thống.
  async create(dto: CreateSizeDto, auditContext: AuditRequestContext = {}): Promise<SizeAdminView> {
    try {
      // 1. Lưu bản ghi kích thước mới vào database.
      const result = await this.repository.create({
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      });
      // 2. Xóa cache cũ để khách hàng thấy được dữ liệu mới ngay lập tức.
      await this.invalidateCache();
      // 3. Ghi log lịch sử để theo dõi ai đã tạo và tạo khi nào.
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
      // Ghi log lỗi để phục vụ việc điều tra sự cố nếu tạo thất bại.
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

  // Cập nhật thông tin kích thước hiện có.
  async update(
    id: number,
    dto: UpdateSizeDto,
    auditContext: AuditRequestContext = {},
  ): Promise<SizeAdminView> {
    let beforeData: SizeAdminView | undefined;
    try {
      // 1. Kiểm tra kích thước có tồn tại không và lấy dữ liệu cũ để ghi log đối soát.
      beforeData = await this.findByIdOrFail(id);
      // 2. Thực hiện cập nhật các thay đổi vào DB.
      const result = await this.repository.update(id, {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      });
      // 3. Đồng bộ lại cache và ghi log thay đổi.
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

  // Xóa kích thước khỏi hệ thống.
  async remove(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    // 1. Xác minh sự tồn tại của bản ghi.
    const beforeData = await this.findByIdOrFail(id);

    try {
      // 2. Kiểm tra ràng buộc dữ liệu: Không xóa nếu đang có sản phẩm sử dụng kích thước này.
      if (await this.repository.hasVariants(id)) {
        throw new ConflictException('Không thể xóa kích thước đang được biến thể sản phẩm sử dụng');
      }

      // 3. Thực hiện xóa, cập nhật cache và ghi log.
      await this.repository.delete(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.delete',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'size.delete',
        resourceType: 'size',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // Vô hiệu hóa cache danh sách kích thước.
  private async invalidateCache(): Promise<void> {
    await this.redis.del(SIZE_CACHE_KEYS.SIZE_LIST);
  }

  // Tìm bản ghi hoặc ném lỗi nếu không tồn tại.
  private async findByIdOrFail(id: number): Promise<SizeAdminView> {
    const size = await this.repository.findById(id);
    if (!size) throw new NotFoundException(`Không tìm thấy kích thước #${id}`);
    return size;
  }

  // Kiểm tra lỗi trùng lặp nhãn kích thước để thông báo chính xác cho người dùng.
  private handleUniqueViolation(err: unknown): void {
    if (isPrismaErrorCode(err, 'P2002')) {
      throw new ConflictException('Kích thước với nhãn này đã tồn tại');
    }
  }
}
