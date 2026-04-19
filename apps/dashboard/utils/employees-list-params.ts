import type { ListEmployeesParams } from '@/lib/api/employees';
import { EMPLOYEE_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/utils/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = EMPLOYEE_TABLE_SORT_IDS as readonly string[];

export function toListEmployeesParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListEmployeesParams {
  const qFilter = columnFilters.find((f) => f.id === 'fullName');
  const search = typeof qFilter?.value === 'string' ? qFilter.value.trim() || undefined : undefined;

  const statusFilter = columnFilters.find((f) => f.id === 'status');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter.value as string[]) : [];
  let status: 'ACTIVE' | 'INACTIVE' | undefined;
  if (statuses.length === 1) {
    if (statuses[0] === 'active') {
      status = 'ACTIVE';
    } else if (statuses[0] === 'inactive') {
      status = 'INACTIVE';
    }
  }

  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delStatuses = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  const base: ListEmployeesParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    status,
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };

  const s = sorting[0];
  if (s && sortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}
