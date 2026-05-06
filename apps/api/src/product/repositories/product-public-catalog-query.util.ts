import { Prisma } from '../../../generated/prisma/client';

export type PublicCatalogProductBaseWhereParams = {
  search?: string;
  categorySlug?: string;
  constrainedProductIds?: number[];
};

export type PublicCatalogVariantGraphWhereParams = {
  colorIds?: number[];
  sizeIds?: number[];
  minPrice?: number;
  maxPrice?: number;
};

export type PublicCatalogListWhereParams = PublicCatalogProductBaseWhereParams &
  PublicCatalogVariantGraphWhereParams;

/** Slug danh mục khớp chính nút, con hoặc cháu (tối đa 3 tầng — giữ đồng bộ với bộ lọc cũ). */
export function categoryWhereMatchesSlugTree(slug: string): Prisma.CategoryWhereInput {
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

/** Product-level predicates shared by storefront catalog list and variant aggregations. */
export function buildPublicCatalogProductBaseWhere(
  params: PublicCatalogProductBaseWhereParams,
): Prisma.ProductWhereInput {
  const trimmedSearch = params.search?.trim();
  return {
    isActive: true,
    deletedAt: null,
    ...(params.constrainedProductIds && { id: { in: params.constrainedProductIds } }),
    ...(trimmedSearch && { name: { contains: trimmedSearch } }),
    ...(params.categorySlug && {
      productCategories: {
        some: { category: categoryWhereMatchesSlugTree(params.categorySlug) },
      },
    }),
  };
}

/**
 * Active variants shown on listing cards / used for MIN price when facets apply.
 * Without color/size/slab filters -> all active variants; with filters -> only matching variants.
 */
export function buildPublicCatalogVariantGraphWhere(
  params: PublicCatalogVariantGraphWhereParams,
): Prisma.ProductVariantWhereInput {
  const variantPriceFilter: Prisma.IntFilter = {};
  if (params.minPrice !== undefined) {
    variantPriceFilter.gte = params.minPrice;
  }
  if (params.maxPrice !== undefined) {
    variantPriceFilter.lte = params.maxPrice;
  }
  const hasFacetConstraint = !!(
    params.colorIds?.length ||
    params.sizeIds?.length ||
    Object.keys(variantPriceFilter).length > 0
  );
  return {
    isActive: true,
    deletedAt: null,
    ...(hasFacetConstraint && params.colorIds?.length && { colorId: { in: params.colorIds } }),
    ...(hasFacetConstraint && params.sizeIds?.length && { sizeId: { in: params.sizeIds } }),
    ...(hasFacetConstraint &&
      Object.keys(variantPriceFilter).length > 0 && { price: variantPriceFilter }),
  };
}

export function buildPublicListWhereInput(
  params: PublicCatalogListWhereParams,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = buildPublicCatalogProductBaseWhere(params);
  const variantFilter = buildPublicCatalogVariantGraphWhere(params);
  if (
    params.colorIds?.length ||
    params.sizeIds?.length ||
    params.minPrice !== undefined ||
    params.maxPrice !== undefined
  ) {
    where.variants = { some: variantFilter };
  }
  return where;
}
