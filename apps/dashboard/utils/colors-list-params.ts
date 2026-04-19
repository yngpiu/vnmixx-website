import type { ListColorsParams } from '@/lib/api/colors';
import { COLOR_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = COLOR_TABLE_SORT_IDS as readonly string[];

export function toListColorsParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListColorsParams {
  const searchFilter = columnFilters.find((f) => f.id === 'name');
  const search =
    typeof searchFilter?.value === 'string' ? searchFilter.value.trim() || undefined : undefined;
  const base: ListColorsParams = {
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
