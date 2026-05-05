import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { softDeletedWhere } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/services/prisma.service';
import {
  type ProductListColorEntry,
  buildPublicListColors,
} from '../utils/public-product-list-colors.util';

// ─── View types ─────────────────────────────────────────────────────────────

export interface ProductListItemView {
  id: number;
  name: string;
  slug: string;
  /** Variant colors (max 4) with front/back URL per color for listing cards; no standalone thumbnail. */
  colors: ProductListColorEntry[];
  variants: {
    id: number;
    price: number;
    compareAtPrice: number | null;
    onHand: number;
    reserved: number;
    color: { id: number; name: string; hexCode: string };
    size: { id: number; label: string; sortOrder: number };
  }[];
  category: { id: number; name: string; slug: string } | null;
}

export interface ProductAdminListItemView {
  id: number;
  name: string;
  slug: string;
  /** First product_images URL by sort order (computed; not persisted on Product). */
  thumbnail: string | null;
  isActive: boolean;
  category: { id: number; name: string; slug: string } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count: { variants: number };
}

export interface ProductDetailView {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  category: { id: number; name: string; slug: string } | null;
  variants: {
    id: number;
    colorId: number;
    sizeId: number;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    onHand: number;
    reserved: number;
    color: { id: number; name: string; hexCode: string };
    size: { id: number; label: string; sortOrder: number };
  }[];
  images: {
    id: number;
    colorId: number | null;
    url: string;
    altText: string | null;
    sortOrder: number;
  }[];
}

export interface ProductAdminDetailView extends ProductDetailView {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  productCategories?: { categoryId: number }[];
  variants: (ProductDetailView['variants'][number] & {
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  })[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Select constants ───────────────────────────────────────────────────────

const VARIANT_PUBLIC_SELECT = {
  id: true,
  colorId: true,
  sizeId: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  onHand: true,
  reserved: true,
  color: { select: { id: true, name: true, hexCode: true } },
  size: { select: { id: true, label: true, sortOrder: true } },
} as const;

const IMAGE_SELECT = {
  id: true,
  colorId: true,
  url: true,
  altText: true,
  sortOrder: true,
} as const;

/** Slug danh mục khớp chính nút, con hoặc cháu (tối đa 3 tầng — giữ đồng bộ với bộ lọc cũ). */
function categoryWhereMatchesSlugTree(slug: string): Prisma.CategoryWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    OR: [
      { slug },
      { parent: { slug, deletedAt: null, isActive: true } },
      { parent: { parent: { slug, deletedAt: null, isActive: true } } },
    ],
  };
}

/** Prisma select for storefront product list rows (typed payload for `findMany`). */
const PUBLIC_LIST_GRAPH_SELECT = {
  id: true,
  name: true,
  slug: true,
  productCategories: {
    take: 1,
    select: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  images: {
    select: { colorId: true, url: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
  variants: {
    where: { isActive: true, deletedAt: null },
    orderBy: [{ color: { id: 'asc' } }, { size: { sortOrder: 'asc' } }],
    select: {
      id: true,
      price: true,
      compareAtPrice: true,
      onHand: true,
      reserved: true,
      color: { select: { id: true, name: true, hexCode: true } },
      size: { select: { id: true, label: true, sortOrder: true } },
    },
  },
} satisfies Prisma.ProductSelect;

type PublicListGraphRow = Prisma.ProductGetPayload<{ select: typeof PUBLIC_LIST_GRAPH_SELECT }>;

/**
 * ProductRepository: Chịu trách nhiệm thao tác dữ liệu sản phẩm trong Database.
 * Sử dụng Prisma Client để thực hiện các truy vấn phức tạp, bao gồm lọc, phân trang,
 * và quản lý các quan hệ (Variants, Images, Categories).
 */
@Injectable()
// Repository Prisma cho các thao tác dữ liệu liên quan đến sản phẩm.
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildPublicListWhereInput(params: {
    search?: string;
    categorySlug?: string;
    colorIds?: number[];
    sizeIds?: number[];
    minPrice?: number;
    maxPrice?: number;
  }): Prisma.ProductWhereInput {
    const { search, categorySlug, colorIds, sizeIds, minPrice, maxPrice } = params;
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search } }),
      ...(categorySlug && {
        productCategories: {
          some: { category: categoryWhereMatchesSlugTree(categorySlug) },
        },
      }),
    };
    const variantPriceFilter: Prisma.IntFilter = {};
    if (minPrice !== undefined) {
      variantPriceFilter.gte = minPrice;
    }
    if (maxPrice !== undefined) {
      variantPriceFilter.lte = maxPrice;
    }
    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(colorIds?.length && { colorId: { in: colorIds } }),
      ...(sizeIds?.length && { sizeId: { in: sizeIds } }),
      ...(Object.keys(variantPriceFilter).length > 0 && { price: variantPriceFilter }),
    };
    if (colorIds?.length || sizeIds?.length || minPrice !== undefined || maxPrice !== undefined) {
      where.variants = { some: variantFilter };
    }
    return where;
  }

  private mapProductGraphToPublicListItem(
    row: PublicListGraphRow,
  ): ProductListItemView & { minPrice: number | null; maxPrice: number | null } {
    const prices = row.variants.map((v) => v.price);
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;
    const colors = buildPublicListColors(row.variants, row.images);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      colors,
      variants: row.variants,
      category: row.productCategories[0]?.category ?? null,
      minPrice: minP,
      maxPrice: maxP,
    };
  }

  private reorderPublicListItemsByIds(
    items: Array<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>,
    orderedIds: number[],
  ): Array<ProductListItemView & { minPrice: number | null; maxPrice: number | null }> {
    const indexOf = new Map(orderedIds.map((id, index) => [id, index]));
    return items.slice().sort((a, b) => indexOf.get(a.id)! - indexOf.get(b.id)!);
  }

  // ─── Public ─────────────────────────────────────────────────────────────────

  // Tìm kiếm danh sách sản phẩm công khai với các bộ lọc và phân trang.
  async findPublicList(params: {
    page: number;
    limit: number;
    search?: string;
    categorySlug?: string;
    colorIds?: number[];
    sizeIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    if (params.sort === 'best_selling') {
      return this.findPublicBestSellingList(params);
    }
    if (params.sort === 'most_favorite') {
      return this.findPublicMostFavoriteList(params);
    }
    if (params.sort === 'price_asc' || params.sort === 'price_desc') {
      return this.findPublicPriceSortedList(params);
    }
    const { page, limit } = params;
    const where = this.buildPublicListWhereInput(params);
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getPublicSortOrder(),
        select: PUBLIC_LIST_GRAPH_SELECT,
      }),
    ]);
    const data = products.map((row) => this.mapProductGraphToPublicListItem(row));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Sort theo MIN(giá biến thể đang hoạt động); Prisma không orderBy aggregate `_min` trên quan hệ kiểu này. */
  private async findPublicPriceSortedList(params: {
    page: number;
    limit: number;
    search?: string;
    categorySlug?: string;
    colorIds?: number[];
    sizeIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    const { page, limit } = params;
    const isAscending = params.sort === 'price_asc';
    const where = this.buildPublicListWhereInput(params);
    const listStubs = await this.prisma.product.findMany({
      where,
      select: { id: true, createdAt: true },
    });
    const total = listStubs.length;
    const totalPages = Math.ceil(total / limit) || 0;
    if (total === 0) {
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }
    const productIds = listStubs.map((stub) => stub.id);
    const minPriceRows = await this.prisma.$queryRaw<
      Array<{ productId: number; minPrice: bigint | number }>
    >(
      Prisma.sql`
        SELECT product_id AS productId, MIN(price) AS minPrice
        FROM product_variants
        WHERE deleted_at IS NULL
          AND is_active = 1
          AND product_id IN (${Prisma.join(productIds)})
        GROUP BY product_id
      `,
    );
    const minVariantPriceByProductId = new Map<number, number>(
      minPriceRows.map((row) => [row.productId, Number(row.minPrice)]),
    );
    const sortKey = (productId: number): number =>
      minVariantPriceByProductId.get(productId) ??
      (isAscending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const sortedStubs = listStubs.slice().sort((leftStub, rightStub) => {
      const leftKey = sortKey(leftStub.id);
      const rightKey = sortKey(rightStub.id);
      if (leftKey !== rightKey) {
        return isAscending ? leftKey - rightKey : rightKey - leftKey;
      }
      return rightStub.createdAt.getTime() - leftStub.createdAt.getTime();
    });
    const pageIds = sortedStubs.slice((page - 1) * limit, page * limit).map((stub) => stub.id);
    if (pageIds.length === 0) {
      return {
        data: [],
        meta: { page, limit, total, totalPages },
      };
    }
    const pageRows = await this.prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: PUBLIC_LIST_GRAPH_SELECT,
    });
    const mapped = pageRows.map((row) => this.mapProductGraphToPublicListItem(row));
    const data = this.reorderPublicListItemsByIds(mapped, pageIds);
    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  private async findPublicBestSellingList(params: {
    page: number;
    limit: number;
    search?: string;
    categorySlug?: string;
    colorIds?: number[];
    sizeIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    const { page, limit } = params;
    const where = this.buildPublicListWhereInput(params);
    const listStubs = await this.prisma.product.findMany({
      where,
      select: { id: true, createdAt: true },
    });
    const total = listStubs.length;
    const totalPages = Math.ceil(total / limit) || 0;
    if (total === 0) {
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }
    const productIds = listStubs.map((stub) => stub.id);
    const bestSellingRows = await this.prisma.$queryRaw<
      Array<{ productId: number; soldCount: bigint | number }>
    >(
      Prisma.sql`
              SELECT pv.product_id AS productId, COALESCE(SUM(oi.quantity), 0) AS soldCount
              FROM order_items oi
              INNER JOIN product_variants pv ON pv.id = oi.variant_id
              INNER JOIN orders o ON o.id = oi.order_id
              WHERE o.status = 'DELIVERED'
                AND pv.product_id IN (${Prisma.join(productIds)})
              GROUP BY pv.product_id
            `,
    );
    const soldCountByProductId = new Map<number, number>(
      bestSellingRows.map((row) => [row.productId, Number(row.soldCount)]),
    );
    const sortedStubs = listStubs.slice().sort((leftStub, rightStub) => {
      const leftSold = soldCountByProductId.get(leftStub.id) ?? 0;
      const rightSold = soldCountByProductId.get(rightStub.id) ?? 0;
      if (leftSold !== rightSold) {
        return rightSold - leftSold;
      }
      return rightStub.createdAt.getTime() - leftStub.createdAt.getTime();
    });
    const pageIds = sortedStubs.slice((page - 1) * limit, page * limit).map((stub) => stub.id);
    if (pageIds.length === 0) {
      return {
        data: [],
        meta: { page, limit, total, totalPages },
      };
    }
    const pageRows = await this.prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: PUBLIC_LIST_GRAPH_SELECT,
    });
    const mapped = pageRows.map((row) => this.mapProductGraphToPublicListItem(row));
    const data = this.reorderPublicListItemsByIds(mapped, pageIds);
    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  /**
   * Sắp xếp theo số lượt thêm vào danh sách yêu thích (wishlist).
   */
  private async findPublicMostFavoriteList(params: {
    page: number;
    limit: number;
    search?: string;
    categorySlug?: string;
    colorIds?: number[];
    sizeIds?: number[];
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }): Promise<
    PaginatedResult<ProductListItemView & { minPrice: number | null; maxPrice: number | null }>
  > {
    const { page, limit } = params;
    const where = this.buildPublicListWhereInput(params);
    const listStubs = await this.prisma.product.findMany({
      where,
      select: { id: true, createdAt: true },
    });
    const total = listStubs.length;
    const totalPages = Math.ceil(total / limit) || 0;
    if (total === 0) {
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }
    const productIds = listStubs.map((stub) => stub.id);
    const favoriteRows = await this.prisma.$queryRaw<
      Array<{ productId: number; favCount: bigint | number }>
    >(
      Prisma.sql`
              SELECT w.product_id AS productId, COUNT(*) AS favCount
              FROM wishlists w
              WHERE w.product_id IN (${Prisma.join(productIds)})
              GROUP BY w.product_id
            `,
    );
    const favoriteCountByProductId = new Map<number, number>(
      favoriteRows.map((row) => [row.productId, Number(row.favCount)]),
    );
    const sortedStubs = listStubs.slice().sort((leftStub, rightStub) => {
      const leftFav = favoriteCountByProductId.get(leftStub.id) ?? 0;
      const rightFav = favoriteCountByProductId.get(rightStub.id) ?? 0;
      if (leftFav !== rightFav) {
        return rightFav - leftFav;
      }
      return rightStub.createdAt.getTime() - leftStub.createdAt.getTime();
    });
    const pageIds = sortedStubs.slice((page - 1) * limit, page * limit).map((stub) => stub.id);
    if (pageIds.length === 0) {
      return {
        data: [],
        meta: { page, limit, total, totalPages },
      };
    }
    const pageRows = await this.prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: PUBLIC_LIST_GRAPH_SELECT,
    });
    const mapped = pageRows.map((row) => this.mapProductGraphToPublicListItem(row));
    const data = this.reorderPublicListItemsByIds(mapped, pageIds);
    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  // Tìm kiếm chi tiết sản phẩm công khai theo ID.
  async findPublicById(id: number): Promise<ProductDetailView | null> {
    return this.prisma.product
      .findFirst({
        where: { id, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          weight: true,
          length: true,
          width: true,
          height: true,
          variants: {
            where: { isActive: true, deletedAt: null },
            select: VARIANT_PUBLIC_SELECT,
            orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
          },
          images: {
            select: IMAGE_SELECT,
            orderBy: { sortOrder: 'asc' },
          },
          productCategories: {
            take: 1,
            orderBy: { categoryId: 'asc' },
            select: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      })
      .then((product) => {
        if (!product) {
          return null;
        }
        const { productCategories, ...productRest } = product;
        return {
          ...productRest,
          category: productCategories[0]?.category ?? null,
        };
      }) as Promise<ProductDetailView | null>;
  }

  async findBySlug(slug: string): Promise<ProductDetailView | null> {
    return this.prisma.product
      .findFirst({
        where: { slug, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          weight: true,
          length: true,
          width: true,
          height: true,
          variants: {
            where: { isActive: true, deletedAt: null },
            select: VARIANT_PUBLIC_SELECT,
            orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
          },
          images: {
            select: IMAGE_SELECT,
            orderBy: { sortOrder: 'asc' },
          },
          productCategories: {
            take: 1,
            orderBy: { categoryId: 'asc' },
            select: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      })
      .then((product) => {
        if (!product) {
          return null;
        }
        const { productCategories, ...productRest } = product;
        return {
          ...productRest,
          category: productCategories[0]?.category ?? null,
        };
      }) as Promise<ProductDetailView | null>;
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  // Xây dựng đối tượng orderBy cho truy vấn danh sách admin.
  private buildAdminListOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.ProductOrderByWithRelationInput {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'name':
        return { name: dir };
      case 'slug':
        return { slug: dir };
      case 'createdAt':
        return { createdAt: dir };
      case 'updatedAt':
        return { updatedAt: dir };
      case 'isActive':
        return { isActive: dir };
      case 'variantCount':
        return { variants: { _count: dir } };
      case 'category':
        return { updatedAt: 'desc' };
      default:
        return { updatedAt: 'desc' };
    }
  }

  // Truy vấn danh sách sản phẩm cho giao diện quản trị với đầy đủ thông tin bộ lọc.
  async findAdminList(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
    isSoftDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<ProductAdminListItemView & { totalStock: number }>> {
    const { page, limit, search, categoryId, isActive, isSoftDeleted, sortBy, sortOrder } = params;

    const where: Prisma.ProductWhereInput = {
      ...softDeletedWhere(isSoftDeleted),
      ...(search && { name: { contains: search } }),
      ...(categoryId !== undefined && {
        productCategories: { some: { categoryId } },
      }),
      ...(isActive !== undefined && { isActive }),
    };

    // Đếm tổng số và lấy dữ liệu sản phẩm admin trong một transaction.
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.buildAdminListOrderBy(sortBy, sortOrder),
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          _count: { select: { variants: true } },
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          productCategories: {
            take: 1,
            select: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          variants: {
            where: { deletedAt: null },
            select: { onHand: true },
          },
        },
      }),
    ]);

    const data = products.map(({ variants, productCategories, images, ...productRest }) => {
      const totalStock = variants.reduce((sum, v) => sum + v.onHand, 0);
      const category = productCategories?.[0]?.category ?? null;
      const thumbnail = images[0]?.url ?? null;
      return { ...productRest, thumbnail, category, totalStock };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Lấy chi tiết sản phẩm cho giao diện quản trị theo ID.
  async findAdminById(id: number): Promise<ProductAdminDetailView | null> {
    return this.prisma.product
      .findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          weight: true,
          length: true,
          width: true,
          height: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          productCategories: {
            select: {
              categoryId: true,
            },
            orderBy: { categoryId: 'asc' },
          },
          variants: {
            select: {
              ...VARIANT_PUBLIC_SELECT,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              deletedAt: true,
            },
            orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
          },
          images: {
            select: IMAGE_SELECT,
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
      .then((product) =>
        product ? { ...product, category: null } : null,
      ) as unknown as Promise<ProductAdminDetailView | null>;
  }

  // Đồng bộ hóa danh mục của sản phẩm bằng cách xóa cũ và thêm mới.
  async syncProductCategories(productId: number, categoryIds: number[]): Promise<void> {
    const unique = [...new Set(categoryIds)].filter((id) => id >= 1);
    await this.prisma.$transaction(async (tx) => {
      // Xóa tất cả các liên kết danh mục hiện tại.
      await tx.productCategory.deleteMany({ where: { productId } });
      if (unique.length > 0) {
        // Thêm các liên kết danh mục mới.
        await tx.productCategory.createMany({
          data: unique.map((categoryId) => ({ productId, categoryId })),
          skipDuplicates: true,
        });
      }
    });
  }

  // ─── Create (transaction) ──────────────────────────────────────────────────

  // Tạo mới một sản phẩm đầy đủ bao gồm biến thể, hình ảnh và danh mục trong một transaction.
  async createFull(data: {
    name: string;
    slug: string;
    description?: string | null;
    weight: number;
    length: number;
    width: number;
    height: number;
    categoryIds: number[];
    isActive?: boolean;
    variants: {
      colorId: number;
      sizeId: number;
      sku: string;
      price: number;
      compareAtPrice?: number;
      onHand: number;
    }[];
    images: {
      url: string;
      colorId?: number | null;
      altText?: string | null;
      sortOrder?: number;
    }[];
  }): Promise<ProductAdminDetailView> {
    const product = await this.prisma.$transaction(async (tx) => {
      // 1. Tạo bản ghi sản phẩm cơ bản.
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          weight: data.weight,
          length: data.length,
          width: data.width,
          height: data.height,
          isActive: data.isActive ?? true,
        },
      });

      // 2. Tạo các biến thể sản phẩm.
      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: created.id,
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            onHand: v.onHand,
            reserved: 0,
            version: 0,
          })),
        });
      }

      // 3. Tạo các hình ảnh sản phẩm.
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img) => ({
            productId: created.id,
            url: img.url,
            colorId: img.colorId ?? null,
            altText: img.altText ?? null,
            sortOrder: img.sortOrder ?? 0,
          })),
        });
      }

      // 4. Tạo các liên kết danh mục.
      const uniqueCatIds = [...new Set(data.categoryIds)].filter((id) => id >= 1);
      if (uniqueCatIds.length > 0) {
        await tx.productCategory.createMany({
          data: uniqueCatIds.map((categoryId) => ({
            productId: created.id,
            categoryId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return this.findAdminById(product.id) as Promise<ProductAdminDetailView>;
  }

  // ─── Update basic info ─────────────────────────────────────────────────────

  // Cập nhật thông tin cơ bản của sản phẩm.
  async updateBasicInfo(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      isActive?: boolean;
    },
  ): Promise<ProductAdminDetailView> {
    // Thực hiện cập nhật thông tin sản phẩm theo ID.
    await this.prisma.product.update({ where: { id }, data });
    return this.findAdminById(id) as Promise<ProductAdminDetailView>;
  }

  // ─── Soft-delete / Restore ─────────────────────────────────────────────────

  // Xóa mềm sản phẩm và tất cả các biến thể của nó.
  async softDelete(id: number): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      // Cập nhật ngày xóa cho sản phẩm.
      this.prisma.product.update({ where: { id }, data: { deletedAt: now } }),
      // Cập nhật ngày xóa cho tất cả biến thể chưa bị xóa mềm.
      this.prisma.productVariant.updateMany({
        where: { productId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
  }

  // Khôi phục sản phẩm và các biến thể đã bị xóa mềm.
  async restore(id: number): Promise<ProductAdminDetailView> {
    await this.prisma.$transaction(async (tx) => {
      // Xóa ngày xóa của sản phẩm.
      await tx.product.update({ where: { id }, data: { deletedAt: null } });
      // Xóa ngày xóa của tất cả biến thể.
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { deletedAt: null },
      });
    });
    return this.findAdminById(id) as Promise<ProductAdminDetailView>;
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  // Tạo mới một biến thể cho sản phẩm.
  async createVariant(
    productId: number,
    data: {
      colorId: number;
      sizeId: number;
      sku: string;
      price: number;
      compareAtPrice?: number;
      onHand: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Thêm bản ghi biến thể mới vào database.
      const createdVariant = await tx.productVariant.create({
        data: {
          productId,
          colorId: data.colorId,
          sizeId: data.sizeId,
          sku: data.sku,
          price: data.price,
          compareAtPrice: data.compareAtPrice ?? null,
          onHand: data.onHand,
          reserved: 0,
          version: 0,
        },
        select: {
          ...VARIANT_PUBLIC_SELECT,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });
      return createdVariant;
    });
  }

  // Tìm kiếm thông tin cơ bản của biến thể theo ID.
  async findVariantById(variantId: number) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        reserved: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  // Cập nhật thông tin của một biến thể.
  async updateVariant(
    variantId: number,
    data: { price?: number; compareAtPrice?: number; onHand?: number; isActive?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Cập nhật các trường dữ liệu được yêu cầu cho biến thể.
      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data,
        select: {
          ...VARIANT_PUBLIC_SELECT,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });
      return updatedVariant;
    });
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  // Thêm mới một hình ảnh cho sản phẩm.
  async createImage(
    productId: number,
    data: { url: string; colorId?: number | null; altText?: string | null; sortOrder?: number },
  ) {
    // Tạo bản ghi hình ảnh mới gắn với sản phẩm.
    return this.prisma.productImage.create({
      data: {
        productId,
        url: data.url,
        colorId: data.colorId ?? null,
        altText: data.altText ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
      select: IMAGE_SELECT,
    });
  }

  // Tìm kiếm thông tin cơ bản của hình ảnh theo ID.
  async findImageById(imageId: number) {
    return this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
  }

  // Cập nhật thông tin của một hình ảnh.
  async updateImage(
    imageId: number,
    data: { colorId?: number | null; altText?: string | null; sortOrder?: number },
  ) {
    // Thay đổi các thuộc tính của hình ảnh.
    return this.prisma.productImage.update({
      where: { id: imageId },
      data,
      select: IMAGE_SELECT,
    });
  }

  // ─── Validation helpers ────────────────────────────────────────────────────

  // Kiểm tra SKU đã tồn tại trong hệ thống hay chưa.
  async skuExists(sku: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.productVariant.count({
      where: { sku, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  // Kiểm tra danh sách ID màu sắc có tồn tại đầy đủ không.
  async colorsExist(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const unique = [...new Set(ids)];
    const count = await this.prisma.color.count({ where: { id: { in: unique } } });
    return count === unique.length;
  }

  // Kiểm tra danh sách ID kích thước có tồn tại đầy đủ không.
  async sizesExist(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const unique = [...new Set(ids)];
    const count = await this.prisma.size.count({ where: { id: { in: unique } } });
    return count === unique.length;
  }

  // Kiểm tra danh mục có tồn tại, đang hoạt động và chưa bị xóa hay không.
  async categoryExists(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { id, deletedAt: null, isActive: true },
    });
    return count > 0;
  }

  // Kiểm tra xem một danh mục có phải là danh mục lá (không có con) hay không.
  async isLeafCategory(id: number): Promise<boolean> {
    const childCount = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null },
    });
    return childCount === 0;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  // Xác định thứ tự sắp xếp cho danh sách sản phẩm công khai.
  private getPublicSortOrder(): Prisma.ProductOrderByWithRelationInput[] {
    return [{ createdAt: 'desc' }];
  }
}
