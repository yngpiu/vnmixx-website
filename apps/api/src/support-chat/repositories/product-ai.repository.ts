import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface ProductAiSearchView {
  id: number;
  name: string;
  slug: string;
  variants: {
    price: number;
    color: { name: string };
    size: { label: string };
  }[];
}

const PRODUCT_AI_SELECT = {
  id: true,
  name: true,
  slug: true,
  variants: {
    where: { isActive: true, deletedAt: null },
    select: {
      price: true,
      color: { select: { name: true } },
      size: { select: { label: true } },
    },
  },
} as const;

@Injectable()
export class ProductAiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByIds(ids: number[]): Promise<ProductAiSearchView[]> {
    if (ids.length === 0) return [];
    return this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, deletedAt: null },
      select: PRODUCT_AI_SELECT,
    }) as Promise<ProductAiSearchView[]>;
  }

  async findActiveByName(query: string, take: number): Promise<ProductAiSearchView[]> {
    const normalizedQuery = query.trim();
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(normalizedQuery ? { name: { contains: normalizedQuery } } : {}),
      },
      select: PRODUCT_AI_SELECT,
      take,
    }) as Promise<ProductAiSearchView[]>;
  }
}
