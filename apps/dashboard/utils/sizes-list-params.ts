import type { ListSizesParams } from '@/lib/api/sizes';
import { getBaseListParams, getSearchQuery } from '@/utils/data-table-query';
import { SIZE_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListSizesParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListSizesParams {
  return {
    ...getBaseListParams(pagination, sorting, SIZE_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'label'),
  };
}
