import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';
import {
  type ProductListColorEntry,
  buildPublicListColors,
} from '../../product/utils/public-product-list-colors.util';

export interface WishlistProductVariantView {
  price: number;
}

export interface WishlistProductView {
  id: number;
  name: string;
  slug: string;
  colors: ProductListColorEntry[];
  variants: WishlistProductVariantView[];
}

export interface WishlistItemView {
  createdAt: Date;
  product: WishlistProductView;
}
export interface WishlistPaginatedView {
  data: WishlistItemView[];
  total: number;
}

// Cấu trúc chọn dữ liệu cho sản phẩm trong danh sách yêu thích.
const WISHLIST_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  images: {
    select: { colorId: true, url: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  variants: {
    select: {
      price: true,
      color: { select: { id: true, name: true, hexCode: true } },
    },
    where: { isActive: true, deletedAt: null },
  },
} as const;

@Injectable()
// Repository Prisma cho các thao tác với danh sách yêu thích.
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy tất cả mục yêu thích của khách hàng, sắp xếp theo thời gian tạo giảm dần.
  async findAllByCustomerId(
    customerId: number,
    page: number,
    limit: number,
  ): Promise<WishlistPaginatedView> {
    const whereClause = {
      customerId,
      product: { isActive: true, deletedAt: null },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.wishlist.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          createdAt: true,
          product: { select: WISHLIST_PRODUCT_SELECT },
        },
      }),
      this.prisma.wishlist.count({
        where: whereClause,
      }),
    ]);
    return {
      data: rows.map((row) => {
        const product = row.product;
        const colors = buildPublicListColors(product.variants, product.images);
        return {
          createdAt: row.createdAt,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            colors,
            variants: product.variants.map((variant) => ({ price: variant.price })),
          },
        };
      }),
      total,
    };
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

  // Xóa sản phẩm khỏi danh sách yêu thích.
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
