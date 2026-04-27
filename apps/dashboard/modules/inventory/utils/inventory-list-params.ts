import {
  getBaseListParams,
  getSearchQuery,
  getSingleFacetedValue,
} from '@/modules/common/utils/data-table-query';
import { INVENTORY_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
import type { ListInventoryParams } from '@/modules/inventory/types/inventory';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListInventoryParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListInventoryParams {
  const statusRaw = getSingleFacetedValue(columnFilters, 'status');
  const status =
    statusRaw === 'in_stock' ||
    statusRaw === 'low_stock' ||
    statusRaw === 'out_of_stock' ||
    statusRaw === 'anomaly'
      ? statusRaw
      : undefined;

  return {
    ...getBaseListParams(pagination, sorting, INVENTORY_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'productName'),
    status,
  };
}
