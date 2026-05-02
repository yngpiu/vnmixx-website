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
    onHand: number;
    reserved: number;
    color: { id: number; name: string; hexCode: string };
    size: { id: number; label: string; sortOrder: number };
  }[];
  category: { id: number; name: string; slug: string } | null;
}

/** Public list aggregation including createdAt — used only to break ties best-selling / favorites sorts. */
type ProductPublicListAggWithCreatedAt = ProductListItemView & {
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: Date;
};

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

/**
 * ProductRepository: Chịu trách nhiệm thao tác dữ liệu sản phẩm trong Database.
 * Sử dụng Prisma Client để thực hiện các truy vấn phức tạp, bao gồm lọc, phân trang,
 * và quản lý các quan hệ (Variants, Images, Categories).
 */
@Injectable()
// Repository Prisma cho các thao tác dữ liệu liên quan đến sản phẩm.
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const { page, limit, search, categorySlug, colorIds, sizeIds, minPrice, maxPrice, sort } =
      params;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search } }),
      ...(categorySlug && {
        productCategories: {
          some: { category: categoryWhereMatchesSlugTree(categorySlug) },
        },
      }),
      ...(minPrice !== undefined && { basePrice: { gte: minPrice } }),
      ...(maxPrice !== undefined && { basePrice: { lte: maxPrice } }),
    };

    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(colorIds?.length && { colorId: { in: colorIds } }),
      ...(sizeIds?.length && { sizeId: { in: sizeIds } }),
    };

    if (colorIds?.length || sizeIds?.length) {
      where.variants = { some: variantFilter };
    }

    // Thực hiện truy vấn đếm tổng số và lấy dữ liệu trong một transaction.
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getPublicSortOrder(sort),
        select: {
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
            select: {
              id: true,
              price: true,
              onHand: true,
              reserved: true,
              color: { select: { id: true, name: true, hexCode: true } },
              size: { select: { id: true, label: true, sortOrder: true } },
            },
          },
        },
      }),
    ]);

    const data = products.map(({ variants, productCategories, images, ...rest }) => {
      const prices = variants.map((v) => v.price);
      const minP = prices.length ? Math.min(...prices) : null;
      const maxP = prices.length ? Math.max(...prices) : null;
      const colors = buildPublicListColors(variants, images);
      return {
        id: rest.id,
        name: rest.name,
        slug: rest.slug,
        colors,
        variants,
        category: productCategories[0]?.category ?? null,
        minPrice: minP,
        maxPrice: maxP,
      };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    const { page, limit, search, categorySlug, colorIds, sizeIds, minPrice, maxPrice } = params;
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search } }),
      ...(categorySlug && {
        productCategories: {
          some: { category: categoryWhereMatchesSlugTree(categorySlug) },
        },
      }),
      ...(minPrice !== undefined && { basePrice: { gte: minPrice } }),
      ...(maxPrice !== undefined && { basePrice: { lte: maxPrice } }),
    };
    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(colorIds?.length && { colorId: { in: colorIds } }),
      ...(sizeIds?.length && { sizeId: { in: sizeIds } }),
    };
    if (colorIds?.length || sizeIds?.length) {
      where.variants = { some: variantFilter };
    }
    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
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
          select: {
            id: true,
            price: true,
            onHand: true,
            reserved: true,
            color: { select: { id: true, name: true, hexCode: true } },
            size: { select: { id: true, label: true, sortOrder: true } },
          },
        },
      },
    });
    const mappedProducts = products.map(
      ({
        variants,
        createdAt,
        productCategories,
        images,
        ...rest
      }): ProductPublicListAggWithCreatedAt => {
        const prices = variants.map((variant) => variant.price);
        const resolvedMinPrice = prices.length > 0 ? Math.min(...prices) : null;
        const resolvedMaxPrice = prices.length > 0 ? Math.max(...prices) : null;
        const colors = buildPublicListColors(variants, images);
        return {
          id: rest.id,
          name: rest.name,
          slug: rest.slug,
          colors,
          variants,
          createdAt,
          category: productCategories[0]?.category ?? null,
          minPrice: resolvedMinPrice,
          maxPrice: resolvedMaxPrice,
        };
      },
    );
    const productIds = mappedProducts.map((product) => product.id);
    const bestSellingRows =
      productIds.length > 0
        ? await this.prisma.$queryRaw<Array<{ productId: number; soldCount: bigint | number }>>(
            Prisma.sql`
              SELECT pv.product_id AS productId, COALESCE(SUM(oi.quantity), 0) AS soldCount
              FROM order_items oi
              INNER JOIN product_variants pv ON pv.id = oi.variant_id
              INNER JOIN orders o ON o.id = oi.order_id
              WHERE o.status = 'DELIVERED'
                AND pv.product_id IN (${Prisma.join(productIds)})
              GROUP BY pv.product_id
            `,
          )
        : [];
    const soldCountByProductId = new Map<number, number>(
      bestSellingRows.map((row) => [row.productId, Number(row.soldCount)]),
    );
    const sortedProducts = mappedProducts.slice().sort((leftProduct, rightProduct) => {
      const leftSoldCount = soldCountByProductId.get(leftProduct.id) ?? 0;
      const rightSoldCount = soldCountByProductId.get(rightProduct.id) ?? 0;
      if (leftSoldCount !== rightSoldCount) {
        return rightSoldCount - leftSoldCount;
      }
      return rightProduct.createdAt.getTime() - leftProduct.createdAt.getTime();
    });
    const total = sortedProducts.length;
    const pagedProducts = sortedProducts.slice((page - 1) * limit, page * limit).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      colors: product.colors,
      variants: product.variants,
      category: product.category,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
    }));
    return {
      data: pagedProducts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    const { page, limit, search, categorySlug, colorIds, sizeIds, minPrice, maxPrice } = params;
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search } }),
      ...(categorySlug && {
        productCategories: {
          some: { category: categoryWhereMatchesSlugTree(categorySlug) },
        },
      }),
      ...(minPrice !== undefined && { basePrice: { gte: minPrice } }),
      ...(maxPrice !== undefined && { basePrice: { lte: maxPrice } }),
    };
    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(colorIds?.length && { colorId: { in: colorIds } }),
      ...(sizeIds?.length && { sizeId: { in: sizeIds } }),
    };
    if (colorIds?.length || sizeIds?.length) {
      where.variants = { some: variantFilter };
    }
    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
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
          select: {
            id: true,
            price: true,
            onHand: true,
            reserved: true,
            color: { select: { id: true, name: true, hexCode: true } },
            size: { select: { id: true, label: true, sortOrder: true } },
          },
        },
      },
    });
    const mappedProducts = products.map(
      ({
        variants,
        createdAt,
        productCategories,
        images,
        ...rest
      }): ProductPublicListAggWithCreatedAt => {
        const prices = variants.map((variant) => variant.price);
        const resolvedMinPrice = prices.length > 0 ? Math.min(...prices) : null;
        const resolvedMaxPrice = prices.length > 0 ? Math.max(...prices) : null;
        const colors = buildPublicListColors(variants, images);
        return {
          id: rest.id,
          name: rest.name,
          slug: rest.slug,
          colors,
          variants,
          createdAt,
          category: productCategories[0]?.category ?? null,
          minPrice: resolvedMinPrice,
          maxPrice: resolvedMaxPrice,
        };
      },
    );
    const productIds = mappedProducts.map((product) => product.id);
    const favoriteRows =
      productIds.length > 0
        ? await this.prisma.$queryRaw<Array<{ productId: number; favCount: bigint | number }>>(
            Prisma.sql`
              SELECT w.product_id AS productId, COUNT(*) AS favCount
              FROM wishlists w
              WHERE w.product_id IN (${Prisma.join(productIds)})
              GROUP BY w.product_id
            `,
          )
        : [];
    const favoriteCountByProductId = new Map<number, number>(
      favoriteRows.map((row) => [row.productId, Number(row.favCount)]),
    );
    const sortedProducts = mappedProducts.slice().sort((leftProduct, rightProduct) => {
      const leftFavCount = favoriteCountByProductId.get(leftProduct.id) ?? 0;
      const rightFavCount = favoriteCountByProductId.get(rightProduct.id) ?? 0;
      if (leftFavCount !== rightFavCount) {
        return rightFavCount - leftFavCount;
      }
      return rightProduct.createdAt.getTime() - leftProduct.createdAt.getTime();
    });
    const total = sortedProducts.length;
    const pagedProducts = sortedProducts.slice((page - 1) * limit, page * limit).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      colors: product.colors,
      variants: product.variants,
      category: product.category,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
    }));
    return {
      data: pagedProducts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
        },
      })
      .then((product) =>
        product ? { ...product, category: null } : null,
      ) as Promise<ProductDetailView | null>;
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
        },
      })
      .then((product) =>
        product ? { ...product, category: null } : null,
      ) as Promise<ProductDetailView | null>;
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
      const initialBasePrice = this.calculateMinPriceFromVariants(data.variants);
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          weight: data.weight,
          length: data.length,
          width: data.width,
          height: data.height,
          basePrice: initialBasePrice,
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
      this.prisma.product.update({ where: { id }, data: { basePrice: null } }),
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
      await this.refreshProductBasePrice(id, tx);
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
      await this.refreshProductBasePrice(productId, tx);
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
    data: { price?: number; onHand?: number; isActive?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const variantRecord = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { productId: true },
      });
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
      await this.refreshProductBasePrice(variantRecord.productId, tx);
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
  private getPublicSortOrder(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ basePrice: 'asc' }, { createdAt: 'desc' }];
      case 'price_desc':
        return [{ basePrice: 'desc' }, { createdAt: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private calculateMinPriceFromVariants(variants: { price: number }[]): number | null {
    if (variants.length === 0) {
      return null;
    }
    return variants.reduce(
      (minPrice, variant) => Math.min(minPrice, variant.price),
      variants[0].price,
    );
  }

  private async refreshProductBasePrice(
    productId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const aggregateResult = await tx.productVariant.aggregate({
      where: {
        productId,
        deletedAt: null,
      },
      _min: { price: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { basePrice: aggregateResult._min.price ?? null },
    });
  }
}
