import {
  CATALOG_PAGINATION_WINDOW_SIZE,
  CATALOG_PRICE_RANGE_MAX,
  CATALOG_SORT_OPTIONS,
} from '@/modules/products/constants/catalog';
import type { ProductListSortOption } from '@/modules/products/types/product-list';

export function parseCatalogPage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function parseCatalogIdsFromSearch(key: string, searchParams: URLSearchParams): number[] {
  const rawValues = [...searchParams.getAll(key)].flatMap((entry) =>
    entry.split(',').map((part) => part.trim()),
  );
  const result: number[] = [];
  for (const raw of rawValues) {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 1) {
      result.push(n);
    }
  }
  return [...new Set(result)];
}

export function parseCatalogSort(value: string | null): ProductListSortOption {
  const allowed = CATALOG_SORT_OPTIONS.map((option) => option.value);
  if (value && allowed.includes(value as ProductListSortOption)) {
    return value as ProductListSortOption;
  }
  return 'newest';
}

export function parseCatalogPrice(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.min(Math.round(parsed), CATALOG_PRICE_RANGE_MAX);
}

export function buildCatalogVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= CATALOG_PAGINATION_WINDOW_SIZE) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const halfFloor = Math.floor(CATALOG_PAGINATION_WINDOW_SIZE / 2);
  let startPage = currentPage - halfFloor;
  let endPage = currentPage + (CATALOG_PAGINATION_WINDOW_SIZE - halfFloor - 1);
  if (startPage < 1) {
    startPage = 1;
    endPage = CATALOG_PAGINATION_WINDOW_SIZE;
  }
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = totalPages - CATALOG_PAGINATION_WINDOW_SIZE + 1;
  }
  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
}
