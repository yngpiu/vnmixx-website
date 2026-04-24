import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

/**
 * WISHLIST_SELECT: Cấu trúc truy vấn để lấy thông tin sản phẩm trong wishlist.
 * Bao gồm tên sản phẩm, slug, ảnh đại diện và giá thấp nhất của các biến thể đang hoạt động.
 */
const WISHLIST_SELECT = {
  createdAt: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnail: true,
      variants: {
        select: { price: true },
        where: { isActive: true, deletedAt: null },
        orderBy: { price: 'asc' as const },
        take: 1,
      },
    },
  },
} as const;

export interface WishlistItemView {
  createdAt: Date;
  product: {
    id: number;
    name: string;
    slug: string;
    thumbnail: string | null;
    variants: { price: number }[];
  };
}

/**
 * WishlistRepository: Lớp thao tác dữ liệu wishlist trong cơ sở dữ liệu.
 * Vai trò: Thực hiện các truy vấn Prisma trực tiếp cho wishlist.
 */
@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truy vấn tất cả các mục wishlist của một khách hàng, sắp xếp theo thời gian thêm mới nhất.
   */
  async findAllByCustomerId(customerId: number): Promise<WishlistItemView[]> {
    return this.prisma.wishlist.findMany({
      where: { customerId, product: { isActive: true, deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: WISHLIST_SELECT,
    }) as unknown as Promise<WishlistItemView[]>;
  }

  /**
   * Kiểm tra xem một sản phẩm đã tồn tại trong wishlist của khách hàng hay chưa.
   */
  async exists(customerId: number, productId: number): Promise<boolean> {
    const count = await this.prisma.wishlist.count({
      where: { customerId, productId },
    });
    return count > 0;
  }

  /**
   * Thêm bản ghi mới vào bảng wishlist.
   */
  async add(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.create({
      data: { customerId, productId },
    });
  }

  /**
   * Xoá bản ghi khỏi bảng wishlist dựa trên khoá chính tổng hợp.
   */
  async remove(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.delete({
      where: { customerId_productId: { customerId, productId } },
    });
  }

  /**
   * Kiểm tra sự tồn tại của sản phẩm trước khi thêm vào wishlist.
   */
  async productExists(productId: number): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id: productId, isActive: true, deletedAt: null },
    });
    return count > 0;
  }
}
