'use client';

import { LabeledInputSelect } from '@/modules/common/components/labeled-input-select';
import { buildCategoryHref } from '@/modules/common/utils/shop-routes';
import { NewArrivalProductItem } from '@/modules/home/components/new-arrival-product-item';
import { fetchProductList, fetchShopColors, fetchShopSizes } from '@/modules/products/api/catalog';
import { CatalogPaginationNav } from '@/modules/products/components/catalog-pagination-nav';
import { CatalogProductGridSkeleton } from '@/modules/products/components/catalog-product-grid-skeleton';
import { CategoryCatalogFiltersPanel } from '@/modules/products/components/category-catalog-filters-panel';
import { CategoryCatalogFiltersSheet } from '@/modules/products/components/category-catalog-filters-sheet';
import {
  CATALOG_LIST_PAGE_LIMIT,
  CATALOG_PRICE_RANGE_MAX,
  CATALOG_SORT_OPTIONS,
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
import { Button } from '@repo/ui/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ProductCategoryPageProps = {
  categorySlug: string;
  categoryName: string;
  parentCategory: { id: number; name: string; slug: string } | null;
};

export function ProductCategoryPage({
  categorySlug,
  categoryName,
  parentCategory,
}: ProductCategoryPageProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseCatalogPage(searchParams.get('page'));
  const sort = parseCatalogSort(searchParams.get('sort'));
  const appliedSearch = searchParams.get('search')?.trim() ?? '';
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
  const colorsQuery = useQuery({
    queryKey: ['shop', 'catalog', 'colors'],
    queryFn: fetchShopColors,
    staleTime: 1000 * 60 * 30,
  });
  const sizesQuery = useQuery({
    queryKey: ['shop', 'catalog', 'sizes'],
    queryFn: fetchShopSizes,
    staleTime: 1000 * 60 * 30,
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
      params.delete('colorIds');
      for (const id of draftColorIds) {
        params.append('colorIds', String(id));
      }
      params.delete('sizeIds');
      for (const id of draftSizeIds) {
        params.append('sizeIds', String(id));
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
  const productPayload: PaginatedProductsResult | undefined = productsQuery.data;
  const items = productPayload?.data ?? [];
  const meta = productPayload?.meta;
  function toggleDraftColor(colorId: number): void {
    setDraftColorIds((previous) =>
      previous.includes(colorId) ? previous.filter((id) => id !== colorId) : [...previous, colorId],
    );
  }
  function toggleDraftSize(sizeId: number): void {
    setDraftSizeIds((previous) =>
      previous.includes(sizeId) ? previous.filter((id) => id !== sizeId) : [...previous, sizeId],
    );
  }
  function handlePageChange(nextPage: number): void {
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
  }
  const filtersPanelProps = {
    sortedSizes,
    isSizesLoading: sizesQuery.isLoading,
    draftSizeIds,
    onToggleDraftSize: toggleDraftSize,
    colorOptions,
    isColorsLoading: colorsQuery.isLoading,
    draftColorIds,
    onToggleDraftColor: toggleDraftColor,
    draftPriceRange,
    onDraftPriceRangeChange: setDraftPriceRange,
    onClearFilters: handleClearFilters,
  };
  return (
    <main className="shop-shell-container pb-16 pt-6 md:pt-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[14px] leading-6 text-muted-foreground">
        <Link href="/" className="transition hover:text-foreground">
          Trang chủ
        </Link>
        <span aria-hidden className="text-muted-foreground/80">
          –
        </span>
        {parentCategory ? (
          <>
            <Link
              href={buildCategoryHref({ id: parentCategory.id, slug: parentCategory.slug })}
              className="transition hover:text-foreground"
            >
              {parentCategory.name}
            </Link>
            <span aria-hidden className="text-muted-foreground/80">
              –
            </span>
          </>
        ) : null}
        <span className="font-medium text-foreground">{categoryName}</span>
      </nav>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="hidden w-full shrink-0 lg:block lg:sticky lg:top-24 lg:w-[272px] lg:min-w-[260px]">
          <CategoryCatalogFiltersPanel {...filtersPanelProps} onApplyFilters={handleApplyFilters} />
        </aside>
        <section className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-xl font-semibold tracking-wide uppercase md:text-2xl">
              {categoryName}
            </h1>
            <div className="flex w-full min-w-0 flex-row items-end gap-2 sm:max-w-[min(100%,20rem)] sm:shrink-0 lg:max-w-[280px]">
              <div className="min-w-0 flex-1">
                <LabeledInputSelect<ProductListSortOption>
                  label="Sắp xếp theo"
                  name="catalog-sort"
                  value={sort}
                  onValueChange={handleSortChange}
                  placeholder="Chọn"
                  options={CATALOG_SORT_OPTIONS}
                  triggerClassName="rounded-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                aria-label="Mở bộ lọc"
                className="h-10 w-10 shrink-0 rounded-sm border-[#E7E8E9] bg-white px-0 shadow-none md:h-12 md:w-12 lg:hidden"
                onClick={() => setIsFilterSheetOpen(true)}
              >
                <SlidersHorizontal className="size-4 md:size-[18px]" aria-hidden />
              </Button>
            </div>
          </div>
          {productsQuery.isLoading ? (
            <CatalogProductGridSkeleton />
          ) : productsQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {productsQuery.error instanceof Error
                ? productsQuery.error.message
                : 'Có lỗi xảy ra.'}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có sản phẩm phù hợp.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((product) => (
                  <NewArrivalProductItem key={product.id} product={product} display="listing" />
                ))}
              </div>
              {meta ? (
                <CatalogPaginationNav
                  page={page}
                  totalPages={meta.totalPages}
                  onPageChange={handlePageChange}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
      <CategoryCatalogFiltersSheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <CategoryCatalogFiltersPanel
          {...filtersPanelProps}
          onApplyFilters={handleApplyFiltersAndCloseSheet}
        />
      </CategoryCatalogFiltersSheet>
    </main>
  );
}
