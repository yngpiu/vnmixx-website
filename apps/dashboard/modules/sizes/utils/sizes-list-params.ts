import { getBaseListParams, getSearchQuery } from '@/modules/common/utils/data-table-query';
import { SIZE_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
import type { ListSizesParams } from '@/modules/sizes/api/sizes';
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
