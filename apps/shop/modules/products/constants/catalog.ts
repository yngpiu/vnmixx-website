import type { ProductListSortOption } from '@/modules/products/types/product-list';

export const CATALOG_PRICE_RANGE_MAX = 10_000_000;

export const CATALOG_LIST_PAGE_LIMIT = 24;

export const CATALOG_PAGINATION_WINDOW_SIZE = 5;

export const CATALOG_SORT_OPTIONS: { value: ProductListSortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Được mua nhiều nhất' },
  { value: 'most_favorite', label: 'Được yêu thích nhất' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
];
