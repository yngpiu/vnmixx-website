import {
  getBaseListParams,
  getSearchQuery,
  getSingleFacetedValue,
} from '@/modules/common/utils/data-table-query';
import { EMPLOYEE_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/modules/common/utils/list-soft-deleted-from-column-filter';
import type { ListEmployeesParams } from '@/modules/employees/api/employees';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListEmployeesParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListEmployeesParams {
  const statusRaw = getSingleFacetedValue(columnFilters, 'status');
  const status =
    statusRaw === 'active' ? 'ACTIVE' : statusRaw === 'inactive' ? 'INACTIVE' : undefined;

  const delStatuses = (columnFilters.find((f) => f.id === 'deleted')?.value as string[]) ?? [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...getBaseListParams(pagination, sorting, EMPLOYEE_TABLE_SORT_IDS),
    search: getSearchQuery(columnFilters, 'fullName'),
    status,
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
