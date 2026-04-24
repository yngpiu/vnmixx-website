import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface ColorView {
  id: number;
  name: string;
  hexCode: string;
}

export interface ColorAdminView extends ColorView {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedColorList {
  data: ColorAdminView[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const COLOR_PUBLIC_SELECT = { id: true, name: true, hexCode: true } as const;

const COLOR_ADMIN_SELECT = {
  ...COLOR_PUBLIC_SELECT,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * ColorRepository: Thao tác cơ sở dữ liệu cho thực thể màu sắc.
 * Vai trò: Thực hiện các truy vấn CRUD trực tiếp thông qua Prisma.
 */
@Injectable()
export class ColorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xây dựng đối tượng sắp xếp cho câu truy vấn danh sách.
   */
  private buildListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.ColorOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'name':
        return { name: dir };
      case 'hexCode':
        return { hexCode: dir };
      case 'updatedAt':
        return { updatedAt: dir };
      default:
        return { name: 'asc' };
    }
  }

  /**
   * Tìm kiếm và phân trang màu sắc trong DB.
   */
  async findList(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedColorList> {
    const { page, limit, search, sortBy, sortOrder } = params;
    const where: Prisma.ColorWhereInput = search
      ? {
          OR: [{ name: { contains: search } }, { hexCode: { contains: search } }],
        }
      : {};

    const [total, data] = await this.prisma.$transaction([
      this.prisma.color.count({ where }),
      this.prisma.color.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildListOrderBy(sortBy, sortOrder),
        select: COLOR_ADMIN_SELECT,
      }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Lấy danh sách màu sắc tinh gọn cho giao diện người dùng.
   */
  findAllPublic(): Promise<ColorView[]> {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
      select: COLOR_PUBLIC_SELECT,
    });
  }

  /**
   * Lấy tất cả màu sắc với đầy đủ thông tin (Admin).
   */
  findAll(): Promise<ColorAdminView[]> {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
      select: COLOR_ADMIN_SELECT,
    });
  }

  /**
   * Tìm một màu sắc theo ID.
   */
  findById(id: number): Promise<ColorAdminView | null> {
    return this.prisma.color.findUnique({
      where: { id },
      select: COLOR_ADMIN_SELECT,
    });
  }

  /**
   * Thêm màu sắc mới vào database.
   */
  create(data: { name: string; hexCode: string }): Promise<ColorAdminView> {
    return this.prisma.color.create({
      data,
      select: COLOR_ADMIN_SELECT,
    });
  }

  /**
   * Cập nhật dữ liệu màu sắc trong database.
   */
  update(id: number, data: { name?: string; hexCode?: string }): Promise<ColorAdminView> {
    return this.prisma.color.update({
      where: { id },
      data,
      select: COLOR_ADMIN_SELECT,
    });
  }

  /**
   * Xóa vĩnh viễn màu sắc khỏi database.
   */
  async delete(id: number): Promise<void> {
    await this.prisma.color.delete({ where: { id } });
  }

  /**
   * Kiểm tra xem màu sắc có đang được sử dụng bởi biến thể sản phẩm nào không.
   */
  async hasVariants(id: number): Promise<boolean> {
    const count = await this.prisma.productVariant.count({ where: { colorId: id } });
    return count > 0;
  }

  /**
   * Kiểm tra xem màu sắc có đang được gán cho hình ảnh sản phẩm nào không.
   */
  async hasImages(id: number): Promise<boolean> {
    const count = await this.prisma.productImage.count({ where: { colorId: id } });
    return count > 0;
  }
}
