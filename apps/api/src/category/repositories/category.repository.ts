import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { softDeletedWhere } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/services/prisma.service';

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

interface CategoryTreeNodeView {
  id: number;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  children: CategoryTreeNodeView[];
}

export type {
  CategoryAdminView,
  CategoryDepthView,
  CategoryParentView,
  CategoryTreeNodeView,
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
// Repository Prisma cho các thao tác đọc và ghi dữ liệu danh mục.
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy cấu trúc cây các danh mục đang hoạt động (tối đa 3 cấp).
  findActiveTree(): Promise<CategoryTreeNodeView[]> {
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
    }) as unknown as Promise<CategoryTreeNodeView[]>;
  }

  // Lấy danh sách toàn bộ danh mục đang hoạt động dưới dạng phẳng.
  findAllActive(): Promise<CategoryView[]> {
    return this.prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        ...CATEGORY_SELECT,
      },
    });
  }

  // Tìm danh mục theo slug và bao gồm các danh mục con trực tiếp.
  async findBySlug(
    slug: string,
  ): Promise<(CategoryView & { children: CategoryTreeNodeView[] }) | null> {
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
    }) as unknown as Promise<(CategoryView & { children: CategoryTreeNodeView[] }) | null>;
  }

  // Lấy danh sách toàn bộ danh mục cho Admin, hỗ trợ lọc theo trạng thái hoạt động và đã xóa.
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

  // Tìm danh mục theo ID, bao gồm cả danh mục đã xóa mềm.
  async findById(id: number): Promise<CategoryAdminView | null> {
    return this.prisma.category.findUnique({
      where: { id },
      select: {
        ...CATEGORY_SELECT,
        deletedAt: true,
      },
    });
  }

  // Lấy thông tin ID và parentId để phục vụ việc kiểm tra phân cấp danh mục.
  async findDepthChain(id: number): Promise<CategoryDepthView | null> {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
  }

  // Tạo mới một danh mục trong cơ sở dữ liệu.
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

  // Cập nhật thông tin danh mục theo ID.
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

  // Cập nhật danh mục và đặt isActive: false cho mọi hậu duệ (trong một transaction).
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

  // Thực hiện xóa mềm bằng cách cập nhật trường deletedAt.
  async softDelete(id: number): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Khôi phục danh mục bằng cách đặt deletedAt thành null.
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

  // Kiểm tra xem danh mục hiện tại có bất kỳ danh mục con nào đang hoạt động hay không.
  async hasActiveChildren(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null, isActive: true },
    });
    return count > 0;
  }
}
