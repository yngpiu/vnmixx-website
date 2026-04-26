import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface WishlistProductVariantView {
  price: number;
}

export interface WishlistProductView {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  variants: WishlistProductVariantView[];
}

export interface WishlistItemView {
  createdAt: Date;
  product: WishlistProductView;
}

// Cấu trúc chọn dữ liệu cho sản phẩm trong danh sách yêu thích.
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

@Injectable()
// Repository Prisma cho các thao tác với danh sách yêu thích.
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy tất cả mục yêu thích của khách hàng, sắp xếp theo thời gian tạo giảm dần.
  async findAllByCustomerId(customerId: number): Promise<WishlistItemView[]> {
    return this.prisma.wishlist.findMany({
      where: {
        customerId,
        product: { isActive: true, deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      select: WISHLIST_SELECT,
    }) as unknown as Promise<WishlistItemView[]>;
  }

  // Kiểm tra xem một sản phẩm đã có trong danh sách yêu thích của khách hàng chưa.
  async exists(customerId: number, productId: number): Promise<boolean> {
    const count = await this.prisma.wishlist.count({
      where: { customerId, productId },
    });
    return count > 0;
  }

  // Thêm mới một sản phẩm vào danh sách yêu thích.
  async add(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.create({
      data: { customerId, productId },
    });
  }

  // Xoá sản phẩm khỏi danh sách yêu thích.
  async remove(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.delete({
      where: { customerId_productId: { customerId, productId } },
    });
  }

  // Kiểm tra sản phẩm có tồn tại và đang hoạt động hay không.
  async productExists(productId: number): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id: productId, isActive: true, deletedAt: null },
    });
    return count > 0;
  }
}
