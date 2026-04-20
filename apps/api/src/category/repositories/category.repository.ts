import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { softDeletedWhere } from '../../common/prisma/soft-deleted-where';
import { PrismaService } from '../../prisma/prisma.service';

interface CategoryParentView {
  id: number;
  name: string;
  slug: string;
}

interface CategoryView {
  id: number;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  parentId: number | null;
  parent: CategoryParentView | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryAdminView extends CategoryView {
  deletedAt: Date | null;
}

interface CategoryDepthView {
  id: number;
  parentId: number | null;
}

interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  children: CategoryTreeNode[];
}

export type {
  CategoryAdminView,
  CategoryDepthView,
  CategoryParentView,
  CategoryTreeNode,
  CategoryView,
};

const PARENT_SELECT = { id: true, name: true, slug: true } as const;

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  isFeatured: true,
  isActive: true,
  sortOrder: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: PARENT_SELECT },
} as const;

const TREE_NODE_SELECT = {
  id: true,
  name: true,
  slug: true,
  isFeatured: true,
  isActive: true,
  sortOrder: true,
} as const;

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public (active only) ─────────────────────────────────────────────────

  findActiveTree(): Promise<CategoryTreeNode[]> {
    return this.prisma.category.findMany({
      where: { parentId: null, deletedAt: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        ...TREE_NODE_SELECT,
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            ...TREE_NODE_SELECT,
            children: {
              where: { deletedAt: null, isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                ...TREE_NODE_SELECT,
                children: false,
              },
            },
          },
        },
      },
    }) as unknown as Promise<CategoryTreeNode[]>;
  }

  findAllActive(): Promise<CategoryView[]> {
    return this.prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        ...CATEGORY_SELECT,
      },
    });
  }

  async findBySlug(
    slug: string,
  ): Promise<(CategoryView & { children: CategoryTreeNode[] }) | null> {
    return this.prisma.category.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      select: {
        ...CATEGORY_SELECT,
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            ...TREE_NODE_SELECT,
            children: false,
          },
        },
      },
    }) as unknown as Promise<(CategoryView & { children: CategoryTreeNode[] }) | null>;
  }

  // ─── Admin (all states) ───────────────────────────────────────────────────

  async findAll(opts?: {
    isActive?: boolean;
    isSoftDeleted?: boolean;
  }): Promise<CategoryAdminView[]> {
    const { isActive, isSoftDeleted } = opts ?? {};

    const where: Prisma.CategoryWhereInput = {
      ...softDeletedWhere(isSoftDeleted),
      ...(isActive !== undefined && { isActive }),
    };

    return this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  async findById(id: number): Promise<CategoryAdminView | null> {
    return this.prisma.category.findUnique({
      where: { id },
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  async findDepthChain(id: number): Promise<CategoryDepthView | null> {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    isFeatured: boolean;
    isActive?: boolean;
    sortOrder: number;
    parentId?: number | null;
  }): Promise<CategoryAdminView> {
    return this.prisma.category.create({
      data,
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      isFeatured?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      parentId?: number | null;
    },
  ): Promise<CategoryAdminView> {
    return this.prisma.category.update({
      where: { id },
      data,
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  /**
   * Cập nhật danh mục và đặt `isActive: false` cho mọi hậu duệ (theo từng cấp, trong một transaction).
   * Dùng khi vô hiệu hóa cha để đồng bộ toàn bộ nhánh.
   */
  async updateAndCascadeDeactivateDescendants(
    id: number,
    data: {
      name?: string;
      slug?: string;
      isFeatured?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      parentId?: number | null;
    },
  ): Promise<CategoryAdminView> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data,
        select: {
          ...CATEGORY_SELECT,
          deletedAt: true,
        },
      });

      let frontier: number[] = [id];
      while (frontier.length > 0) {
        const children = await tx.category.findMany({
          where: { parentId: { in: frontier } },
          select: { id: true },
        });
        const childIds = children.map((c) => c.id);
        if (childIds.length === 0) break;

        await tx.category.updateMany({
          where: { id: { in: childIds } },
          data: { isActive: false },
        });

        frontier = childIds;
      }

      return updated;
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number): Promise<CategoryAdminView> {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: null },
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  /**
   * Kiểm tra xem danh mục hiện tại có bất kỳ danh mục con nào đang hoạt động hay không.
   */
  async hasActiveChildren(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null, isActive: true },
    });
    return count > 0;
  }
}
