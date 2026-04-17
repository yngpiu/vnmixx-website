import type { ListSizesParams } from '@/lib/api/sizes';
import { SIZE_TABLE_SORT_IDS } from '@/lib/data-table-sort-allowlists';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = SIZE_TABLE_SORT_IDS as readonly string[];

export function toListSizesParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListSizesParams {
  const searchFilter = columnFilters.find((f) => f.id === 'label');
  const search =
    typeof searchFilter?.value === 'string' ? searchFilter.value.trim() || undefined : undefined;
  const base: ListSizesParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  };

  const s = sorting[0];
  if (s && sortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}
