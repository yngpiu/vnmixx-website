import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ─── View types ─────────────────────────────────────────────────────────────

export interface ProductListItemView {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  category: { id: number; name: string; slug: string } | null;
}

export interface ProductAdminListItemView {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  isActive: boolean;
  category: { id: number; name: string } | null;
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
  thumbnail: string | null;
  category: { id: number; name: string; slug: string } | null;
  productAttributes: {
    attributeValue: {
      id: number;
      value: string;
      attribute: { id: number; name: string };
    };
  }[];
  variants: {
    id: number;
    colorId: number;
    sizeId: number;
    sku: string;
    price: number;
    salePrice: number | null;
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

const CATEGORY_BRIEF_SELECT = { id: true, name: true, slug: true } as const;

const VARIANT_PUBLIC_SELECT = {
  id: true,
  colorId: true,
  sizeId: true,
  sku: true,
  price: true,
  salePrice: true,
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

const PRODUCT_ATTRIBUTE_SELECT = {
  attributeValue: {
    select: {
      id: true,
      value: true,
      attribute: { select: { id: true, name: true } },
    },
  },
} as const;

/** Slug danh mục khớp chính nút, con hoặc cháu (tối đa 3 tầng — giữ đồng bộ với bộ lọc cũ). */
function categoryWhereMatchesSlugTree(slug: string): Prisma.CategoryWhereInput {
  return {
    deletedAt: null,
    OR: [
      { slug },
      { parent: { slug, deletedAt: null } },
      { parent: { parent: { slug, deletedAt: null } } },
    ],
  };
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

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
    const { page, limit, search, categorySlug, colorIds, sizeIds, minPrice, maxPrice, sort } =
      params;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search && { name: { contains: search } }),
      ...(categorySlug && {
        OR: [
          { category: categoryWhereMatchesSlugTree(categorySlug) },
          {
            productCategories: {
              some: { category: categoryWhereMatchesSlugTree(categorySlug) },
            },
          },
        ],
      }),
    };

    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(colorIds?.length && { colorId: { in: colorIds } }),
      ...(sizeIds?.length && { sizeId: { in: sizeIds } }),
    };

    if (colorIds?.length || sizeIds?.length || minPrice !== undefined || maxPrice !== undefined) {
      where.variants = { some: variantFilter };
    }

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
          thumbnail: true,
          category: { select: CATEGORY_BRIEF_SELECT },
          variants: {
            where: { isActive: true, deletedAt: null },
            select: { price: true, salePrice: true },
          },
        },
      }),
    ]);

    const data = products.map(({ variants, ...rest }) => {
      const prices = variants.map((v) => v.salePrice ?? v.price);
      const minP = prices.length ? Math.min(...prices) : null;
      const maxP = prices.length ? Math.max(...prices) : null;
      return { ...rest, minPrice: minP, maxPrice: maxP };
    });

    let filtered = data;
    if (minPrice !== undefined) {
      filtered = filtered.filter((p) => p.maxPrice !== null && p.maxPrice >= minPrice);
    }
    if (maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.minPrice !== null && p.minPrice <= maxPrice);
    }

    return {
      data: filtered,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string): Promise<ProductDetailView | null> {
    return this.prisma.product.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        category: { select: CATEGORY_BRIEF_SELECT },
        productAttributes: { select: PRODUCT_ATTRIBUTE_SELECT },
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
    });
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async findAdminList(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: number;
    isActive?: boolean;
    includeDeleted?: boolean;
  }): Promise<PaginatedResult<ProductAdminListItemView & { totalStock: number }>> {
    const { page, limit, search, categoryId, isActive, includeDeleted } = params;

    const where: Prisma.ProductWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(search && { name: { contains: search } }),
      ...(categoryId !== undefined && {
        OR: [{ categoryId }, { productCategories: { some: { categoryId } } }],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          isActive: true,
          category: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          _count: { select: { variants: true } },
          variants: {
            where: { deletedAt: null },
            select: { onHand: true },
          },
        },
      }),
    ]);

    const data = products.map(({ variants, ...rest }) => {
      const totalStock = variants.reduce((sum, v) => sum + v.onHand, 0);
      return { ...rest, totalStock };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAdminById(id: number): Promise<ProductAdminDetailView | null> {
    return this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        thumbnail: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        category: { select: CATEGORY_BRIEF_SELECT },
        productCategories: { select: { categoryId: true } },
        productAttributes: { select: PRODUCT_ATTRIBUTE_SELECT },
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
    }) as unknown as Promise<ProductAdminDetailView | null>;
  }

  /** Xóa toàn bộ liên kết danh mục, ghi lại danh sách, đồng bộ `category_id` = phần tử đầu (hoặc null). */
  async syncProductCategories(productId: number, categoryIds: number[]): Promise<void> {
    const unique = [...new Set(categoryIds)].filter((id) => id >= 1);
    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.deleteMany({ where: { productId } });
      if (unique.length > 0) {
        await tx.productCategory.createMany({
          data: unique.map((categoryId) => ({ productId, categoryId })),
          skipDuplicates: true,
        });
      }
      await tx.product.update({
        where: { id: productId },
        data: { categoryId: unique[0] ?? null },
      });
    });
  }

  // ─── Create (transaction) ──────────────────────────────────────────────────

  async createFull(data: {
    name: string;
    slug: string;
    description?: string | null;
    thumbnail?: string | null;
    categoryId?: number | null;
    categoryIds: number[];
    isActive?: boolean;
    attributeValueIds: number[];
    variants: {
      colorId: number;
      sizeId: number;
      sku: string;
      price: number;
      salePrice?: number | null;
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
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          thumbnail: data.thumbnail ?? null,
          categoryId: data.categoryIds[0] ?? data.categoryId ?? null,
          isActive: data.isActive ?? true,
        },
      });

      if (data.attributeValueIds.length > 0) {
        await tx.productAttribute.createMany({
          data: data.attributeValueIds.map((avId) => ({
            productId: created.id,
            attributeValueId: avId,
          })),
        });
      }

      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: created.id,
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku,
            price: v.price,
            salePrice: v.salePrice ?? null,
            onHand: v.onHand,
            reserved: 0,
            version: 0,
          })),
        });
      }

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

  async updateBasicInfo(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      thumbnail?: string | null;
      categoryId?: number | null;
      isActive?: boolean;
    },
  ): Promise<ProductAdminDetailView> {
    await this.prisma.product.update({ where: { id }, data });
    return this.findAdminById(id) as Promise<ProductAdminDetailView>;
  }

  // ─── Soft-delete / Restore ─────────────────────────────────────────────────

  async softDelete(id: number): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { deletedAt: now } }),
      this.prisma.productVariant.updateMany({
        where: { productId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
  }

  async restore(id: number): Promise<ProductAdminDetailView> {
    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { deletedAt: null } }),
      this.prisma.productVariant.updateMany({
        where: { productId: id },
        data: { deletedAt: null },
      }),
    ]);
    return this.findAdminById(id) as Promise<ProductAdminDetailView>;
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async createVariant(
    productId: number,
    data: {
      colorId: number;
      sizeId: number;
      sku: string;
      price: number;
      salePrice?: number | null;
      onHand: number;
    },
  ) {
    return this.prisma.productVariant.create({
      data: {
        productId,
        colorId: data.colorId,
        sizeId: data.sizeId,
        sku: data.sku,
        price: data.price,
        salePrice: data.salePrice ?? null,
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
  }

  async findVariantById(variantId: number) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  async updateVariant(
    variantId: number,
    data: { price?: number; salePrice?: number | null; onHand?: number; isActive?: boolean },
  ) {
    return this.prisma.productVariant.update({
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
  }

  async softDeleteVariant(variantId: number): Promise<void> {
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  async createImage(
    productId: number,
    data: { url: string; colorId?: number | null; altText?: string | null; sortOrder?: number },
  ) {
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

  async findImageById(imageId: number) {
    return this.prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
  }

  async updateImage(
    imageId: number,
    data: { colorId?: number | null; altText?: string | null; sortOrder?: number },
  ) {
    return this.prisma.productImage.update({
      where: { id: imageId },
      data,
      select: IMAGE_SELECT,
    });
  }

  async deleteImage(imageId: number): Promise<void> {
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }

  // ─── Product Attributes ────────────────────────────────────────────────────

  async syncAttributes(productId: number, attributeValueIds: number[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.productAttribute.deleteMany({ where: { productId } }),
      ...(attributeValueIds.length > 0
        ? [
            this.prisma.productAttribute.createMany({
              data: attributeValueIds.map((avId) => ({
                productId,
                attributeValueId: avId,
              })),
            }),
          ]
        : []),
    ]);
  }

  // ─── Validation helpers ────────────────────────────────────────────────────

  async skuExists(sku: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.productVariant.count({
      where: { sku, ...(excludeId && { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  async attributeValuesExist(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const count = await this.prisma.attributeValue.count({ where: { id: { in: ids } } });
    return count === ids.length;
  }

  async colorsExist(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const unique = [...new Set(ids)];
    const count = await this.prisma.color.count({ where: { id: { in: unique } } });
    return count === unique.length;
  }

  async sizesExist(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const unique = [...new Set(ids)];
    const count = await this.prisma.size.count({ where: { id: { in: unique } } });
    return count === unique.length;
  }

  async categoryExists(id: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async isLeafCategory(id: number): Promise<boolean> {
    const childCount = await this.prisma.category.count({
      where: { parentId: id, deletedAt: null },
    });
    return childCount === 0;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private getPublicSortOrder(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
      case 'price_desc':
        return [{ createdAt: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}
