'use client';

import { listShopCategories } from '@/modules/header/api/categories';
import { buildHeaderCategoryTree } from '@/modules/header/utils/header-nav';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { HeaderCategoryNode, ShopCategory } from '../types/header';

interface UseCategoriesQueryResult {
  categories: ShopCategory[];
  categoryTree: HeaderCategoryNode[];
  isLoading: boolean;
  isError: boolean;
}

export const SHOP_CATEGORIES_QUERY_KEY = ['shop-categories'] as const;

export function useCategoriesQuery(): UseCategoriesQueryResult {
  const queryResult: UseQueryResult<ShopCategory[]> = useQuery({
    queryKey: SHOP_CATEGORIES_QUERY_KEY,
    queryFn: listShopCategories,
  });
  const categories = queryResult.data ?? [];
  return {
    categories,
    categoryTree: buildHeaderCategoryTree(categories),
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
  };
}
