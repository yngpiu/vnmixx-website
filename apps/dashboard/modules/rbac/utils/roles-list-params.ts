import { getBaseListParams } from '@/modules/common/utils/data-table-query';
import { ROLE_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
import type { ListRolesParams } from '@/modules/rbac/api/rbac';
import type { PaginationState, SortingState } from '@tanstack/react-table';

export function toListRolesParams(
  pagination: PaginationState,
  globalFilter: string,
  sorting: SortingState,
): ListRolesParams {
  return {
    ...getBaseListParams(pagination, sorting, ROLE_TABLE_SORT_IDS),
    search: globalFilter.trim() || undefined,
  };
}
