import type { ListRolesParams } from '@/lib/api/rbac';
import { ROLE_TABLE_SORT_IDS } from '@/utils/data-table-sort-allowlists';
import type { PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = ROLE_TABLE_SORT_IDS as readonly string[];

export function toListRolesParams(
  pagination: PaginationState,
  globalFilter: string,
  sorting: SortingState,
): ListRolesParams {
  const search = globalFilter.trim() || undefined;
  const base: ListRolesParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  };

  const s = sorting[0];
  if (s && sortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}
