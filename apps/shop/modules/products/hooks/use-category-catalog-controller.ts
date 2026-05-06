'use client';

import {
  fetchProductList,
  fetchShopCatalogColorFacets,
  fetchShopCatalogSizeFacets,
} from '@/modules/products/api/catalog';
import {
  CATALOG_LIST_PAGE_LIMIT,
  CATALOG_PRICE_RANGE_MAX,
} from '@/modules/products/constants/catalog';
import type {
  PaginatedProductsResult,
  ProductListSortOption,
} from '@/modules/products/types/product-list';
import {
  parseCatalogIdsFromSearch,
  parseCatalogPage,
  parseCatalogPrice,
  parseCatalogSort,
} from '@/modules/products/utils/catalog-url-parsers';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type UseCategoryCatalogControllerParams = {
  categorySlug: string;
};

type UseCategoryCatalogControllerReturn = {
  page: number;
  sort: ProductListSortOption;
  productsQuery: ReturnType<typeof useQuery<PaginatedProductsResult>>;
  colorsQuery: ReturnType<typeof useQuery>;
  sizesQuery: ReturnType<typeof useQuery>;
  sortedSizes: { id: number; label: string; sortOrder: number }[];
  colorOptions: { id: number; name: string; hexCode: string }[];
  draftColorIds: number[];
  draftSizeIds: number[];
  draftPriceRange: [number, number];
  isFilterSheetOpen: boolean;
  setDraftPriceRange: (value: [number, number]) => void;
  setIsFilterSheetOpen: (value: boolean) => void;
  handleSortChange: (nextSort: ProductListSortOption) => void;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
  handleApplyFiltersAndCloseSheet: () => void;
  toggleDraftColor: (colorId: number) => void;
  toggleDraftSize: (sizeId: number) => void;
  handlePageChange: (nextPage: number) => void;
};

export function useCategoryCatalogController({
  categorySlug,
}: UseCategoryCatalogControllerParams): UseCategoryCatalogControllerReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseCatalogPage(searchParams.get('page'));
  const sort = parseCatalogSort(searchParams.get('sort'));
  const appliedSearch = searchParams.get('q')?.trim() ?? searchParams.get('search')?.trim() ?? '';
  const appliedColorIds = useMemo(
    () => parseCatalogIdsFromSearch('colorIds', searchParams),
    [searchParams],
  );
  const appliedSizeIds = useMemo(
    () => parseCatalogIdsFromSearch('sizeIds', searchParams),
    [searchParams],
  );
  const appliedMinPrice = useMemo(() => {
    const raw = searchParams.get('minPrice');
    if (raw === null) {
      return 0;
    }
    return parseCatalogPrice(raw, 0);
  }, [searchParams]);
  const appliedMaxPrice = useMemo(() => {
    const raw = searchParams.get('maxPrice');
    if (raw === null) {
      return CATALOG_PRICE_RANGE_MAX;
    }
    return parseCatalogPrice(raw, CATALOG_PRICE_RANGE_MAX);
  }, [searchParams]);
  const [draftColorIds, setDraftColorIds] = useState<number[]>(appliedColorIds);
  const [draftSizeIds, setDraftSizeIds] = useState<number[]>(appliedSizeIds);
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>([
    appliedMinPrice,
    appliedMaxPrice,
  ]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  useEffect(() => {
    setDraftColorIds(appliedColorIds);
  }, [appliedColorIds]);
  useEffect(() => {
    setDraftSizeIds(appliedSizeIds);
  }, [appliedSizeIds]);
  useEffect(() => {
    setDraftPriceRange([appliedMinPrice, appliedMaxPrice]);
  }, [appliedMinPrice, appliedMaxPrice]);
  const facetColorQueryParams = useMemo(
    () => ({
      categorySlug: categorySlug.trim() ? categorySlug : undefined,
      search: appliedSearch || undefined,
      sizeIds: appliedSizeIds.length > 0 ? appliedSizeIds : undefined,
      minPrice: appliedMinPrice > 0 ? appliedMinPrice : undefined,
      maxPrice: appliedMaxPrice < CATALOG_PRICE_RANGE_MAX ? appliedMaxPrice : undefined,
    }),
    [categorySlug, appliedSearch, appliedSizeIds, appliedMinPrice, appliedMaxPrice],
  );
  const colorsQuery = useQuery({
    queryKey: [
      'shop',
      'catalog',
      'facet-colors',
      facetColorQueryParams.categorySlug ?? '',
      facetColorQueryParams.search ?? '',
      (facetColorQueryParams.sizeIds ?? []).join(','),
      facetColorQueryParams.minPrice ?? '',
      facetColorQueryParams.maxPrice ?? '',
    ],
    queryFn: () => fetchShopCatalogColorFacets(facetColorQueryParams),
    staleTime: 1000 * 60 * 5,
  });
  const facetSizeQueryParams = useMemo(
    () => ({
      categorySlug: categorySlug.trim() ? categorySlug : undefined,
      search: appliedSearch || undefined,
      colorIds: appliedColorIds.length > 0 ? appliedColorIds : undefined,
      minPrice: appliedMinPrice > 0 ? appliedMinPrice : undefined,
      maxPrice: appliedMaxPrice < CATALOG_PRICE_RANGE_MAX ? appliedMaxPrice : undefined,
    }),
    [categorySlug, appliedSearch, appliedColorIds, appliedMinPrice, appliedMaxPrice],
  );
  const sizesQuery = useQuery({
    queryKey: [
      'shop',
      'catalog',
      'facet-sizes',
      facetSizeQueryParams.categorySlug ?? '',
      facetSizeQueryParams.search ?? '',
      (facetSizeQueryParams.colorIds ?? []).join(','),
      facetSizeQueryParams.minPrice ?? '',
      facetSizeQueryParams.maxPrice ?? '',
    ],
    queryFn: () => fetchShopCatalogSizeFacets(facetSizeQueryParams),
    staleTime: 1000 * 60 * 5,
  });
  const listQueryKey = useMemo(
    () => [
      'shop',
      'products',
      'list',
      categorySlug,
      page,
      sort,
      appliedSearch,
      appliedColorIds.join(','),
      appliedSizeIds.join(','),
      appliedMinPrice,
      appliedMaxPrice,
    ],
    [
      categorySlug,
      page,
      sort,
      appliedSearch,
      appliedColorIds,
      appliedSizeIds,
      appliedMinPrice,
      appliedMaxPrice,
    ],
  );
  const productsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      fetchProductList({
        page,
        limit: CATALOG_LIST_PAGE_LIMIT,
        categorySlug,
        sort,
        search: appliedSearch || undefined,
        colorIds: appliedColorIds.length > 0 ? appliedColorIds : undefined,
        sizeIds: appliedSizeIds.length > 0 ? appliedSizeIds : undefined,
        minPrice: appliedMinPrice > 0 ? appliedMinPrice : undefined,
        maxPrice: appliedMaxPrice < CATALOG_PRICE_RANGE_MAX ? appliedMaxPrice : undefined,
      }),
  });
  const replaceQuery = useCallback(
    (mutate: (params: URLSearchParams) => void): void => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const handleSortChange = useCallback(
    (nextSort: ProductListSortOption): void => {
      replaceQuery((params) => {
        params.set('sort', nextSort);
        params.delete('page');
      });
    },
    [replaceQuery],
  );
  const handleApplyFilters = useCallback((): void => {
    replaceQuery((params) => {
      const normalizedColorIds = [...new Set(draftColorIds)].sort((left, right) => left - right);
      const normalizedSizeIds = [...new Set(draftSizeIds)].sort((left, right) => left - right);
      if (normalizedColorIds.length > 0) {
        params.set('colorIds', normalizedColorIds.join(','));
      } else {
        params.delete('colorIds');
      }
      if (normalizedSizeIds.length > 0) {
        params.set('sizeIds', normalizedSizeIds.join(','));
      } else {
        params.delete('sizeIds');
      }
      if (draftPriceRange[0] > 0) {
        params.set('minPrice', String(draftPriceRange[0]));
      } else {
        params.delete('minPrice');
      }
      if (draftPriceRange[1] < CATALOG_PRICE_RANGE_MAX) {
        params.set('maxPrice', String(draftPriceRange[1]));
      } else {
        params.delete('maxPrice');
      }
      params.delete('page');
    });
  }, [draftColorIds, draftPriceRange, draftSizeIds, replaceQuery]);
  const handleClearFilters = useCallback((): void => {
    setDraftColorIds([]);
    setDraftSizeIds([]);
    setDraftPriceRange([0, CATALOG_PRICE_RANGE_MAX]);
    replaceQuery((params) => {
      params.delete('colorIds');
      params.delete('sizeIds');
      params.delete('minPrice');
      params.delete('maxPrice');
      params.delete('page');
    });
  }, [replaceQuery]);
  const handleApplyFiltersAndCloseSheet = useCallback((): void => {
    handleApplyFilters();
    setIsFilterSheetOpen(false);
  }, [handleApplyFilters]);
  const sortedSizes = useMemo(() => {
    const list = sizesQuery.data ?? [];
    return [...list].sort((left, right) => left.sortOrder - right.sortOrder);
  }, [sizesQuery.data]);
  const colorOptions = colorsQuery.data ?? [];
  const meta = productsQuery.data?.meta;
  const toggleDraftColor = useCallback((colorId: number): void => {
    setDraftColorIds((previous) =>
      previous.includes(colorId) ? previous.filter((id) => id !== colorId) : [...previous, colorId],
    );
  }, []);
  const toggleDraftSize = useCallback((sizeId: number): void => {
    setDraftSizeIds((previous) =>
      previous.includes(sizeId) ? previous.filter((id) => id !== sizeId) : [...previous, sizeId],
    );
  }, []);
  const handlePageChange = useCallback(
    (nextPage: number): void => {
      if (nextPage === page || nextPage < 1 || (meta && nextPage > meta.totalPages)) {
        return;
      }
      replaceQuery((params) => {
        if (nextPage <= 1) {
          params.delete('page');
        } else {
          params.set('page', String(nextPage));
        }
      });
    },
    [meta, page, replaceQuery],
  );
  return {
    page,
    sort,
    productsQuery,
    colorsQuery,
    sizesQuery,
    sortedSizes,
    colorOptions,
    draftColorIds,
    draftSizeIds,
    draftPriceRange,
    isFilterSheetOpen,
    setDraftPriceRange,
    setIsFilterSheetOpen,
    handleSortChange,
    handleApplyFilters,
    handleClearFilters,
    handleApplyFiltersAndCloseSheet,
    toggleDraftColor,
    toggleDraftSize,
    handlePageChange,
  };
}
