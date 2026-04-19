import type { ListColorsParams } from '@/lib/api/colors';
import { getBaseListParams, getSearchQuery } from '@/utils/data-table-query';
import { COLOR_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListColorsParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListColorsParams {
  return {
    ...getBaseListParams(pagination, sorting, COLOR_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'name'),
  };
}
