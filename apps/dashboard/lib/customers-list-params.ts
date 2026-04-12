import type { ListCustomersParams } from '@/lib/api/customers';
import { CUSTOMER_TABLE_SORT_IDS } from '@/lib/data-table-sort-allowlists';
import { isSoftDeletedFromDeletedColumnFilter } from '@/lib/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = CUSTOMER_TABLE_SORT_IDS as readonly string[];

export function toListCustomersParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListCustomersParams {
  const qFilter = columnFilters.find((f) => f.id === 'fullName');
  const search = typeof qFilter?.value === 'string' ? qFilter.value.trim() || undefined : undefined;

  const statusFilter = columnFilters.find((f) => f.id === 'isActive');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter.value as string[]) : [];
  let isActive: boolean | undefined;
  if (statuses.length === 1) {
    if (statuses[0] === 'active') {
      isActive = true;
    } else if (statuses[0] === 'inactive') {
      isActive = false;
    }
  }

  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delStatuses = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  const base: ListCustomersParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    isActive,
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };

  const s = sorting[0];
  if (s && sortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}
