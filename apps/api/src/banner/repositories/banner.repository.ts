import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

interface BannerCategoryView {
  id: number;
  name: string;
  slug: string;
}

interface BannerView {
  id: number;
  placement: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  title: string | null;
  imageUrl: string;
  categoryId: number;
  isActive: boolean;
  sortOrder: number;
  category: BannerCategoryView;
  createdAt: Date;
  updatedAt: Date;
}
type BannerAdminView = BannerView;

interface CategoryStatusView {
  id: number;
  isActive: boolean;
  deletedAt: Date | null;
}

const BANNER_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
} as const;

const BANNER_SELECT = {
  id: true,
  placement: true,
  title: true,
  imageUrl: true,
  categoryId: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: { select: BANNER_CATEGORY_SELECT },
} as const;

export type { BannerAdminView, BannerCategoryView, BannerView, CategoryStatusView };

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActivePublic(opts?: {
    placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  }): Promise<BannerView[]> {
    const where: Prisma.BannerWhereInput = {
      isActive: true,
      ...(opts?.placement !== undefined && { placement: opts.placement }),
      category: { deletedAt: null, isActive: true },
    };
    return this.prisma.banner.findMany({
      where,
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: BANNER_SELECT,
    });
  }

  findAll(opts?: {
    isActive?: boolean;
    placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
  }): Promise<BannerAdminView[]> {
    const { isActive, placement } = opts ?? {};
    const where: Prisma.BannerWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(placement !== undefined && { placement }),
    };
    return this.prisma.banner.findMany({
      where,
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: BANNER_SELECT,
    });
  }

  findById(id: number): Promise<BannerAdminView | null> {
    return this.prisma.banner.findFirst({
      where: { id },
      select: BANNER_SELECT,
    });
  }

  findCategoryStatusById(categoryId: number): Promise<CategoryStatusView | null> {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isActive: true, deletedAt: true },
    });
  }

  create(data: {
    placement: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
    title?: string | null;
    imageUrl: string;
    categoryId: number;
    isActive: boolean;
    sortOrder: number;
  }): Promise<BannerAdminView> {
    return this.prisma.banner.create({
      data,
      select: BANNER_SELECT,
    });
  }

  update(
    id: number,
    data: {
      placement?: 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';
      title?: string | null;
      imageUrl?: string;
      categoryId?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<BannerAdminView> {
    return this.prisma.banner.update({
      where: { id },
      data,
      select: BANNER_SELECT,
    });
  }

  deleteById(id: number): Promise<void> {
    return this.prisma.banner.delete({ where: { id } }).then(() => undefined);
  }
}
