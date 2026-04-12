import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../../redis/cache-keys';
import { RedisService } from '../../redis/redis.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import {
  CategoryAdminView,
  CategoryRepository,
  CategoryTreeNode,
  CategoryView,
} from '../repositories/category.repository';

const MAX_DEPTH = 3;

@Injectable()
export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly redis: RedisService,
  ) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  async findActiveTree(): Promise<CategoryTreeNode[]> {
    return this.redis.getOrSet(CACHE_KEYS.CATEGORY_TREE, CACHE_TTL.CATEGORY, () =>
      this.repository.findActiveTree(),
    );
  }

  async findActiveFlat(): Promise<CategoryView[]> {
    return this.redis.getOrSet(CACHE_KEYS.CATEGORY_LIST, CACHE_TTL.CATEGORY, () =>
      this.repository.findAllActive(),
    );
  }

  async findBySlug(slug: string): Promise<CategoryView & { children: CategoryTreeNode[] }> {
    const category = await this.redis.getOrSet(
      CACHE_KEYS.CATEGORY_SLUG(slug),
      CACHE_TTL.CATEGORY,
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

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(opts?: {
    isActive?: boolean;
    isSoftDeleted?: boolean;
  }): Promise<CategoryAdminView[]> {
    return this.repository.findAll(opts);
  }

  async findById(id: number): Promise<CategoryAdminView> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục #${id}`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryAdminView> {
    if (dto.parentId !== undefined) {
      await this.validateParentForCreate(dto.parentId);
    }

    try {
      const result = await this.repository.create({
        name: dto.name,
        slug: dto.slug,
        isFeatured: dto.isFeatured ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId ?? null,
      });
      await this.invalidateCache();
      return result;
    } catch (err) {
      this.handleUniqueViolation(err, dto.slug);
      throw err;
    }
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryAdminView> {
    const existing = await this.findById(id);

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
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      parentId,
    };

    try {
      const result =
        dto.isActive === false
          ? await this.repository.updateAndCascadeDeactivateDescendants(id, updatePayload)
          : await this.repository.update(id, updatePayload);
      await this.invalidateCache();
      return result;
    } catch (err) {
      if (dto.slug) this.handleUniqueViolation(err, dto.slug);
      throw err;
    }
  }

  async softDelete(id: number): Promise<void> {
    await this.findById(id);

    const hasChildren = await this.repository.hasActiveChildren(id);
    if (hasChildren) {
      throw new ConflictException('Không thể xóa danh mục còn danh mục con đang hoạt động');
    }

    await this.repository.softDelete(id);
    await this.invalidateCache();
  }

  async restore(id: number): Promise<CategoryAdminView> {
    const category = await this.findById(id);

    if (!category.deletedAt) {
      throw new BadRequestException('Danh mục chưa bị xóa');
    }

    if (category.parentId !== null) {
      const parent = await this.repository.findById(category.parentId);
      if (parent?.deletedAt) {
        throw new BadRequestException('Không thể khôi phục danh mục có danh mục cha đã bị xóa');
      }
      if (parent && !parent.isActive) {
        throw new BadRequestException(
          'Không thể khôi phục danh mục có danh mục cha đang vô hiệu hóa',
        );
      }
    }

    const result = await this.repository.restore(id);
    await this.invalidateCache();
    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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

  /**
   * Walk up the ancestor chain and return how deep parentId is (1-indexed).
   * Root category = depth 1, its child = depth 2, etc.
   */
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

  /** Ensure newParentId is not a descendant of categoryId (prevents cycles). */
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

  private async invalidateCache(): Promise<void> {
    await this.redis.deleteByPattern(CACHE_PATTERNS.ALL_CATEGORIES);
  }

  private handleUniqueViolation(err: unknown, slug: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }
  }
}
