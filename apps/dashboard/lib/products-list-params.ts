import type { ListProductsParams } from '@/lib/api/products';
import { PRODUCT_TABLE_SORT_IDS } from '@/lib/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/lib/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = PRODUCT_TABLE_SORT_IDS as readonly string[];

export function toListProductsParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  globalFilter: string,
  sorting: SortingState,
): ListProductsParams {
  const search = globalFilter.trim() || undefined;

  const statusFilter = columnFilters.find((f) => f.id === 'isActive');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter.value as string[]) : [];
  let isActive: boolean | undefined;
  if (statuses.length === 1) {
    if (statuses[0] === 'active') isActive = true;
    else if (statuses[0] === 'inactive') isActive = false;
  }

  const catFilter = columnFilters.find((f) => f.id === 'categoryId');
  const catVals = Array.isArray(catFilter?.value) ? (catFilter.value as string[]) : [];
  let categoryId: number | undefined;
  const catRaw = catVals[0];
  if (catVals.length === 1 && typeof catRaw === 'string') {
    const n = Number.parseInt(catRaw, 10);
    if (Number.isFinite(n) && n >= 1) categoryId = n;
  }

  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delStatuses = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  const base: ListProductsParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };

  const s = sorting[0];
  if (s && sortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}
