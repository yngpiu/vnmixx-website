import type { ListEmployeesParams } from '@/lib/api/employees';
import { getBaseListParams, getSearchQuery, getSingleFacetedValue } from '@/utils/data-table-query';
import { EMPLOYEE_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/utils/list-soft-deleted-from-column-filter';
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
