import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import {
  CategoryAdminView,
  CategoryRepository,
  CategoryTreeNode,
} from '../repositories/category.repository';

const MAX_DEPTH = 3;

@Injectable()
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  async findActiveTree(): Promise<CategoryTreeNode[]> {
    return this.repository.findActiveTree();
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(includeDeleted = false): Promise<CategoryAdminView[]> {
    return this.repository.findAll(includeDeleted);
  }

  async findById(id: number): Promise<CategoryAdminView> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryAdminView> {
    if (dto.parentId !== undefined) {
      await this.validateParentForCreate(dto.parentId);
    }

    try {
      return await this.repository.create({
        name: dto.name,
        slug: dto.slug,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId ?? null,
      });
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
          throw new BadRequestException('A category cannot be its own parent');
        }
        await this.validateParentForCreate(newParentId);
        await this.validateNoCircularRef(id, newParentId);
      }
    }

    // parentId not in dto -- keep existing; explicitly null means move to root
    const parentId = dto.parentId !== undefined ? dto.parentId : existing.parentId;

    try {
      return await this.repository.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        parentId,
      });
    } catch (err) {
      if (dto.slug) this.handleUniqueViolation(err, dto.slug);
      throw err;
    }
  }

  async softDelete(id: number): Promise<void> {
    await this.findById(id);

    const hasChildren = await this.repository.hasActiveChildren(id);
    if (hasChildren) {
      throw new ConflictException('Cannot delete a category that has active children');
    }

    await this.repository.softDelete(id);
  }

  async restore(id: number): Promise<CategoryAdminView> {
    const category = await this.findById(id);

    if (!category.deletedAt) {
      throw new BadRequestException('Category is not deleted');
    }

    if (category.parentId !== null) {
      const parent = await this.repository.findById(category.parentId);
      if (parent?.deletedAt) {
        throw new BadRequestException('Cannot restore a category whose parent is soft-deleted');
      }
    }

    return this.repository.restore(id);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async validateParentForCreate(parentId: number): Promise<void> {
    const parent = await this.repository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Parent category #${parentId} not found`);
    }
    if (parent.deletedAt) {
      throw new BadRequestException(`Parent category #${parentId} is soft-deleted`);
    }

    const depth = await this.getAncestorDepth(parentId);
    if (depth + 1 >= MAX_DEPTH) {
      throw new BadRequestException(`Category cannot exceed ${MAX_DEPTH} levels deep`);
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
        throw new BadRequestException('Circular parent reference detected');
      }
      const node = await this.repository.findDepthChain(currentId);
      if (!node) break;
      currentId = node.parentId;
    }
  }

  private handleUniqueViolation(err: unknown, slug: string): void {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }
  }
}
