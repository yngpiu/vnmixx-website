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
  const statusRaw = getSingleFacetedValue(columnFilters, 'status');
  const status =
    statusRaw === 'active'
      ? 'ACTIVE'
      : statusRaw === 'inactive'
        ? 'INACTIVE'
        : statusRaw === 'pending'
          ? 'PENDING_VERIFICATION'
          : undefined;

  const delStatuses = (columnFilters.find((f) => f.id === 'deleted')?.value as string[]) ?? [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...getBaseListParams(pagination, sorting, CUSTOMER_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'fullName'),
    ...(status !== undefined ? { status } : {}),
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
