import type { ListProductsParams } from '@/lib/api/products';
import { getBaseListParams, getSearchQuery, getSingleFacetedValue } from '@/utils/data-table-query';
import { PRODUCT_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/utils/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListProductsParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListProductsParams {
  const statusRaw = getSingleFacetedValue(columnFilters, 'isActive');
  const isActive = statusRaw === 'active' ? true : statusRaw === 'inactive' ? false : undefined;

  const catRaw = getSingleFacetedValue(columnFilters, 'categoryId');
  let categoryId: number | undefined;
  if (catRaw) {
    const n = Number.parseInt(catRaw, 10);
    if (Number.isFinite(n) && n >= 1) categoryId = n;
  }

  const delStatuses = (columnFilters.find((f) => f.id === 'deleted')?.value as string[]) ?? [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...getBaseListParams(pagination, sorting, PRODUCT_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'name'),
    categoryId,
    isActive,
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
