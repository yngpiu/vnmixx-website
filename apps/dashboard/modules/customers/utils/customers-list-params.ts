import {
  getBaseListParams,
  getSearchQuery,
  getSingleFacetedValue,
} from '@/modules/common/utils/data-table-query';
import { CUSTOMER_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/modules/common/utils/list-soft-deleted-from-column-filter';
import type { ListCustomersParams } from '@/modules/customers/api/customers';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListCustomersParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListCustomersParams {
  const isActiveRaw = getSingleFacetedValue(columnFilters, 'isActive');
  const isActive = isActiveRaw === 'active' ? true : isActiveRaw === 'inactive' ? false : undefined;

  const delStatuses = (columnFilters.find((f) => f.id === 'deleted')?.value as string[]) ?? [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...getBaseListParams(pagination, sorting, CUSTOMER_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'fullName'),
    isActive,
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
