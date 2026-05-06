'use client';

import { LabeledInputSelect } from '@/modules/common/components/labeled-input-select';
import { ProductCard } from '@/modules/common/components/product-card';
import { buildCategoryHref } from '@/modules/common/utils/shop-routes';
import { CatalogPaginationNav } from '@/modules/products/components/catalog-pagination-nav';
import { CatalogProductGridSkeleton } from '@/modules/products/components/catalog-product-grid-skeleton';
import { CategoryCatalogFiltersPanel } from '@/modules/products/components/category-catalog-filters-panel';
import { CategoryCatalogFiltersSheet } from '@/modules/products/components/category-catalog-filters-sheet';
import { CATALOG_SORT_OPTIONS } from '@/modules/products/constants/catalog';
import { useCategoryCatalogController } from '@/modules/products/hooks/use-category-catalog-controller';
import type { ProductListSortOption } from '@/modules/products/types/product-list';
import { Button } from '@repo/ui/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

type ProductCategoryPageProps = {
  categorySlug: string;
  categoryName: string;
  breadcrumbCategories?: { id: number; name: string; slug: string }[];
};

export function ProductCategoryPage({
  categorySlug,
  categoryName,
  breadcrumbCategories = [],
}: ProductCategoryPageProps): React.JSX.Element {
  const {
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
  } = useCategoryCatalogController({ categorySlug });
  const productPayload = productsQuery.data;
  const items = productPayload?.data ?? [];
  const meta = productPayload?.meta;
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
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        {breadcrumbCategories.map((category) => (
          <span key={category.id} className="contents">
            <Link
              href={buildCategoryHref({ slug: category.slug })}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
            <span className="mx-2" aria-hidden>
              /
            </span>
          </span>
        ))}
        <span className="text-foreground">{categoryName}</span>
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
                  <ProductCard key={product.id} product={product} display="listing" />
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
