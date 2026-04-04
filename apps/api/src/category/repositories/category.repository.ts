import { Injectable } from '@nestjs/common';
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
  sortOrder: true,
} as const;

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public (active only) ─────────────────────────────────────────────────

  findActiveTree(): Promise<CategoryTreeNode[]> {
    return this.prisma.category.findMany({
      where: { parentId: null, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        ...TREE_NODE_SELECT,
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            ...TREE_NODE_SELECT,
            children: {
              where: { deletedAt: null },
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

  // ─── Admin (all states) ───────────────────────────────────────────────────

  async findAll(includeDeleted = false): Promise<CategoryAdminView[]> {
    return this.prisma.category.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
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

  async hasActiveChildren(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null },
    });
    return count > 0;
  }
}
