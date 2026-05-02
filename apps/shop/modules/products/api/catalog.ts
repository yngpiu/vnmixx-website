import { API_BASE_URL } from '@/config/constants';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import type { PaginatedProductsResult } from '@/modules/products/types/product-list';
import type { ShopProductReviewsResult } from '@/modules/products/types/product-reviews';

export type ShopColorOption = {
  id: number;
  name: string;
  hexCode: string;
};

export type ShopSizeOption = {
  id: number;
  label: string;
  sortOrder: number;
};

type ApiSuccessEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as
    | ApiSuccessEnvelope<T>
    | { success: boolean; message?: string };
  if (!response.ok || !json.success) {
    const detail =
      'message' in json && typeof json.message === 'string' ? json.message : response.statusText;
    throw new Error(detail);
  }
  if (!('data' in json)) {
    throw new Error('Unexpected API response.');
  }
  return json.data;
}

function buildProductsQuery(params: {
  page: number;
  limit: number;
  categorySlug?: string;
  sort: string;
  search?: string;
  colorIds?: number[];
  sizeIds?: number[];
  minPrice?: number;
  maxPrice?: number;
}): string {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sort: params.sort,
  });
  if (params.categorySlug) {
    searchParams.set('categorySlug', params.categorySlug);
  }
  const normalizedSearch = params.search?.trim();
  if (normalizedSearch) {
    searchParams.set('search', normalizedSearch);
  }
  if (params.minPrice !== undefined) {
    searchParams.set('minPrice', String(params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    searchParams.set('maxPrice', String(params.maxPrice));
  }
  for (const colorId of params.colorIds ?? []) {
    searchParams.append('colorIds', String(colorId));
  }
  for (const sizeId of params.sizeIds ?? []) {
    searchParams.append('sizeIds', String(sizeId));
  }
  return searchParams.toString();
}

/**
 * Loads a page of products for the storefront (public API).
 */
export async function fetchProductList(params: {
  page: number;
  limit: number;
  categorySlug?: string;
  sort: string;
  search?: string;
  colorIds?: number[];
  sizeIds?: number[];
  minPrice?: number;
  maxPrice?: number;
}): Promise<PaginatedProductsResult> {
  const query = buildProductsQuery(params);
  const response = await fetch(`${API_BASE_URL}/products?${query}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  type ListPayload = { data: NewArrivalProduct[]; meta: PaginatedProductsResult['meta'] };
  const parsed = await parseJsonResponse<ListPayload>(response);
  const items = (parsed.data ?? []).map((product) => ({
    ...product,
    colors: product.colors ?? [],
  }));
  return {
    data: items,
    meta: parsed.meta,
  };
}

export async function fetchShopColors(): Promise<ShopColorOption[]> {
  const response = await fetch(`${API_BASE_URL}/colors`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return parseJsonResponse<ShopColorOption[]>(response);
}

export async function fetchShopSizes(): Promise<ShopSizeOption[]> {
  const response = await fetch(`${API_BASE_URL}/sizes`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return parseJsonResponse<ShopSizeOption[]>(response);
}

/**
 * Public paginated reviews for a product (by ID).
 */
export async function fetchProductReviews(
  productId: number,
  params: { page: number; limit?: number },
): Promise<ShopProductReviewsResult> {
  const limit = params.limit ?? 10;
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(limit),
  });
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}/reviews?${searchParams.toString()}`,
    {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
  );
  return parseJsonResponse<ShopProductReviewsResult>(response);
}

const SUGGESTED_PRODUCTS_LIMIT = 10;
const SUGGESTED_PRODUCTS_FETCH_LIMIT = 12;

/**
 * Suggested products on PDP: newest products from same category.
 */
export async function fetchSuggestedProductsByCategory(params: {
  categorySlug?: string;
  excludedProductId: number;
}): Promise<NewArrivalProduct[]> {
  const query = buildProductsQuery({
    page: 1,
    limit: SUGGESTED_PRODUCTS_FETCH_LIMIT,
    sort: 'newest',
    categorySlug: params.categorySlug,
  });
  const response = await fetch(`${API_BASE_URL}/products?${query}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  type ListPayload = { data: NewArrivalProduct[]; meta: PaginatedProductsResult['meta'] };
  const parsed = await parseJsonResponse<ListPayload>(response);
  return (parsed.data ?? [])
    .map((product) => ({
      ...product,
      colors: product.colors ?? [],
    }))
    .filter((product) => product.id !== params.excludedProductId)
    .slice(0, SUGGESTED_PRODUCTS_LIMIT);
}
