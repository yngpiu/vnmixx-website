import type { ListEmployeesParams } from '@/lib/api/employees';
import type { ColumnFiltersState, PaginationState } from '@tanstack/react-table';

export function toListEmployeesParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
): ListEmployeesParams {
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

  const archive = columnFilters.find((f) => f.id === 'archive');
  const archiveVals = Array.isArray(archive?.value) ? (archive.value as string[]) : [];
  const includeDeleted = archiveVals.includes('with_deleted');

  return {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    isActive,
    includeDeleted,
  };
}
