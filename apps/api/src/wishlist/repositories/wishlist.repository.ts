import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomerId(customerId: number): Promise<WishlistItemView[]> {
    return this.prisma.wishlist.findMany({
      where: { customerId, product: { isActive: true, deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: WISHLIST_SELECT,
    }) as unknown as Promise<WishlistItemView[]>;
  }

  async exists(customerId: number, productId: number): Promise<boolean> {
    const count = await this.prisma.wishlist.count({
      where: { customerId, productId },
    });
    return count > 0;
  }

  async add(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.create({
      data: { customerId, productId },
    });
  }

  async remove(customerId: number, productId: number): Promise<void> {
    await this.prisma.wishlist.delete({
      where: { customerId_productId: { customerId, productId } },
    });
  }

  async productExists(productId: number): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id: productId, isActive: true, deletedAt: null },
    });
    return count > 0;
  }
}
