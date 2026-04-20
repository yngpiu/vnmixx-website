import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SizeView {
  id: number;
  label: string;
  sortOrder: number;
}

export interface SizeAdminView extends SizeView {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedSizeList {
  data: SizeAdminView[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const SIZE_PUBLIC_SELECT = { id: true, label: true, sortOrder: true } as const;

const SIZE_ADMIN_SELECT = {
  ...SIZE_PUBLIC_SELECT,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * SizeRepository: Thao tác cơ sở dữ liệu cho thực thể kích thước.
 * Vai trò: Thực hiện các truy vấn CRUD trực tiếp thông qua Prisma.
 */
@Injectable()
export class SizeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xây dựng đối tượng sắp xếp cho danh sách kích thước.
   */
  private buildListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.SizeOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'label':
        return { label: dir };
      case 'sortOrder':
        return { sortOrder: dir };
      case 'updatedAt':
        return { updatedAt: dir };
      default:
        return { sortOrder: 'asc' };
    }
  }

  /**
   * Tìm kiếm và phân trang kích thước trong DB.
   */
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedSizeList> {
    const { page, limit, search, sortBy, sortOrder } = params;
    const where: Prisma.SizeWhereInput = search ? { label: { contains: search } } : {};

    const [total, data] = await this.prisma.$transaction([
      this.prisma.size.count({ where }),
      this.prisma.size.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildListOrderBy(sortBy, sortOrder),
        select: SIZE_ADMIN_SELECT,
      }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Lấy danh sách kích thước cho giao diện khách hàng.
   */
  findAllPublic(): Promise<SizeView[]> {
    return this.prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
      select: SIZE_PUBLIC_SELECT,
    });
  }

  /**
   * Lấy tất cả kích thước (Admin).
   */
  findAll(): Promise<SizeAdminView[]> {
    return this.prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
      select: SIZE_ADMIN_SELECT,
    });
  }

  /**
   * Tìm kích thước theo ID.
   */
  findById(id: number): Promise<SizeAdminView | null> {
    return this.prisma.size.findUnique({
      where: { id },
      select: SIZE_ADMIN_SELECT,
    });
  }

  /**
   * Thêm kích thước mới vào DB.
   */
  create(data: { label: string; sortOrder: number }): Promise<SizeAdminView> {
    return this.prisma.size.create({
      data,
      select: SIZE_ADMIN_SELECT,
    });
  }

  /**
   * Cập nhật kích thước trong DB.
   */
  update(id: number, data: { label?: string; sortOrder?: number }): Promise<SizeAdminView> {
    return this.prisma.size.update({
      where: { id },
      data,
      select: SIZE_ADMIN_SELECT,
    });
  }

  /**
   * Xóa kích thước khỏi DB.
   */
  async delete(id: number): Promise<void> {
    await this.prisma.size.delete({ where: { id } });
  }

  /**
   * Kiểm tra kích thước có đang được sử dụng bởi biến thể sản phẩm nào không.
   */
  async hasVariants(id: number): Promise<boolean> {
    const count = await this.prisma.productVariant.count({ where: { sizeId: id } });
    return count > 0;
  }
}
