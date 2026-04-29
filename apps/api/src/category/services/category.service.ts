import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogStatus } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { isPrismaErrorCode } from '../../common/utils/prisma.util';
import { RedisService } from '../../redis/services/redis.service';
import {
  CATEGORY_CACHE_KEYS,
  CATEGORY_CACHE_PATTERNS,
  CATEGORY_CACHE_TTL,
} from '../category.cache';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import {
  CategoryAdminView,
  CategoryRepository,
  CategoryTreeNodeView,
  CategoryView,
} from '../repositories/category.repository';

const MAX_DEPTH = 3;

@Injectable()
// Xử lý logic nghiệp vụ cho danh mục sản phẩm.
export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly redis: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Lấy cấu trúc cây danh mục đang hoạt động và lưu cache để tái sử dụng.
  async findActiveTree(): Promise<CategoryTreeNodeView[]> {
    return this.redis.getOrSet(CATEGORY_CACHE_KEYS.CATEGORY_TREE, CATEGORY_CACHE_TTL.CATEGORY, () =>
      this.repository.findActiveTree(),
    );
  }

  // Lấy danh sách danh mục phẳng đang hoạt động và lưu cache để tái sử dụng.
  async findActiveFlat(): Promise<CategoryView[]> {
    return this.redis.getOrSet(CATEGORY_CACHE_KEYS.CATEGORY_LIST, CATEGORY_CACHE_TTL.CATEGORY, () =>
      this.repository.findAllActive(),
    );
  }

  // Kiểm tra danh mục tồn tại theo slug trước khi trả về chi tiết.
  async findBySlug(slug: string): Promise<CategoryView & { children: CategoryTreeNodeView[] }> {
    const category = await this.redis.getOrSet(
      CATEGORY_CACHE_KEYS.CATEGORY_SLUG(slug),
      CATEGORY_CACHE_TTL.CATEGORY,
      async () => {
        const result = await this.repository.findBySlug(slug);
        return result ?? null;
      },
    );
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục "${slug}"`);
    }
    return category;
  }

  // Lấy toàn bộ danh sách danh mục cho Admin với các bộ lọc tùy chọn.
  async findAll(opts?: {
    isActive?: boolean;
    isSoftDeleted?: boolean;
  }): Promise<CategoryAdminView[]> {
    return this.repository.findAll(opts);
  }

  // Lấy chi tiết danh mục theo ID, ném lỗi nếu không tồn tại.
  async findById(id: number): Promise<CategoryAdminView> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục #${id}`);
    }
    return category;
  }

  // Kiểm tra tính hợp lệ của danh mục cha và tạo mới danh mục.
  async create(
    dto: CreateCategoryDto,
    auditContext: AuditRequestContext = {},
  ): Promise<CategoryAdminView> {
    try {
      if (dto.parentId !== undefined) {
        await this.validateParentForCreate(dto.parentId);
      }

      const result = await this.repository.create({
        name: dto.name,
        slug: dto.slug,
        isFeatured: dto.isFeatured ?? false,
        showInHeader: dto.showInHeader ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId ?? null,
      });
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.create',
        resourceType: 'category',
        resourceId: String(result.id),
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.create',
        resourceType: 'category',
        status: AuditLogStatus.FAILED,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.handleUniqueViolation(error, dto.slug);
      throw error;
    }
  }

  // Cập nhật thông tin danh mục, đảm bảo không có tham chiếu vòng lặp.
  async update(
    id: number,
    dto: UpdateCategoryDto,
    auditContext: AuditRequestContext = {},
  ): Promise<CategoryAdminView> {
    let beforeData: CategoryAdminView | undefined;
    try {
      const existing = await this.findById(id);
      beforeData = existing;

      if (dto.parentId !== undefined) {
        const newParentId = dto.parentId;
        if (newParentId !== null) {
          if (newParentId === id) {
            throw new BadRequestException('Danh mục không thể là danh mục cha của chính nó');
          }
          await this.validateParentForCreate(newParentId);
          await this.validateNoCircularRef(id, newParentId);
        }
      }

      // parentId not in dto -- keep existing; explicitly null means move to root
      const parentId = dto.parentId !== undefined ? dto.parentId : existing.parentId;

      const updatePayload = {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.showInHeader !== undefined && { showInHeader: dto.showInHeader }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        parentId,
      };

      const result =
        dto.isActive === false
          ? await this.repository.updateAndCascadeDeactivateDescendants(id, updatePayload)
          : await this.repository.update(id, updatePayload);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.update',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.update',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: dto,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      if (dto.slug) this.handleUniqueViolation(error, dto.slug);
      throw error;
    }
  }

  // Xóa mềm danh mục, kiểm tra không có danh mục con đang hoạt động trước khi xóa.
  async softDelete(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const beforeData = await this.repository.findById(id);
    try {
      await this.findById(id);

      const hasChildren = await this.repository.hasActiveChildren(id);
      if (hasChildren) {
        throw new ConflictException('Không thể xóa danh mục còn danh mục con đang hoạt động');
      }

      await this.repository.softDelete(id);
      await this.invalidateCache();
      const afterData = await this.repository.findById(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.delete',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeData ?? undefined,
        afterData: afterData ?? undefined,
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.delete',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeData ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Khôi phục danh mục đã xóa mềm, kiểm tra danh mục cha hợp lệ.
  async restore(id: number, auditContext: AuditRequestContext = {}): Promise<CategoryAdminView> {
    const beforeSnapshot = await this.repository.findById(id);
    try {
      const category = await this.findById(id);

      if (!category.deletedAt) {
        throw new BadRequestException('Danh mục chưa bị xóa mềm');
      }

      if (category.parentId !== null) {
        const parent = await this.repository.findById(category.parentId);
        if (parent?.deletedAt) {
          throw new BadRequestException(
            'Không thể khôi phục danh mục có danh mục cha đã bị xóa mềm',
          );
        }
        if (parent && !parent.isActive) {
          throw new BadRequestException(
            'Không thể khôi phục danh mục có danh mục cha đang vô hiệu hóa',
          );
        }
      }

      const result = await this.repository.restore(id);
      await this.invalidateCache();
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.restore',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: beforeSnapshot ?? undefined,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'category.restore',
        resourceType: 'category',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: beforeSnapshot ?? undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Kiểm tra tính hợp lệ của danh mục cha khi tạo mới hoặc cập nhật.
  private async validateParentForCreate(parentId: number): Promise<void> {
    const parent = await this.repository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Không tìm thấy danh mục cha #${parentId}`);
    }
    if (parent.deletedAt) {
      throw new BadRequestException(`Danh mục cha #${parentId} đã bị xóa`);
    }
    if (!parent.isActive) {
      throw new BadRequestException(`Danh mục cha #${parentId} không còn hoạt động`);
    }

    const depth = await this.getAncestorDepth(parentId);
    if (depth + 1 > MAX_DEPTH) {
      throw new BadRequestException(`Danh mục không thể vượt quá ${MAX_DEPTH} cấp`);
    }
  }

  // Đếm độ sâu của danh mục hiện tại (tối đa là 3 cấp).
  private async getAncestorDepth(categoryId: number): Promise<number> {
    let depth = 0;
    let currentId: number | null = categoryId;

    while (currentId !== null) {
      depth++;
      const node = await this.repository.findDepthChain(currentId);
      if (!node) break;
      currentId = node.parentId;
    }

    return depth;
  }

  // Đảm bảo danh mục cha mới không phải là hậu duệ của danh mục hiện tại (tránh vòng lặp).
  private async validateNoCircularRef(categoryId: number, newParentId: number): Promise<void> {
    let currentId: number | null = newParentId;

    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new BadRequestException('Phát hiện tham chiếu vòng lặp ở danh mục cha');
      }
      const node = await this.repository.findDepthChain(currentId);
      if (!node) break;
      currentId = node.parentId;
    }
  }

  // Xóa toàn bộ dữ liệu cache liên quan đến danh mục khi có thay đổi.
  private async invalidateCache(): Promise<void> {
    await this.redis.deleteByPattern(CATEGORY_CACHE_PATTERNS.ALL_CATEGORIES);
  }

  // Xử lý lỗi vi phạm ràng buộc duy nhất từ Prisma (P2002).
  private handleUniqueViolation(err: unknown, slug: string): void {
    if (isPrismaErrorCode(err, 'P2002')) {
      throw new ConflictException(`Slug "${slug}" đã được sử dụng`);
    }
  }
}
