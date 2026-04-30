import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';

export type ProductListSortOption =
  | 'newest'
  | 'best_selling'
  | 'most_favorite'
  | 'price_desc'
  | 'price_asc';

export type PaginatedProductsResult = {
  data: NewArrivalProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
