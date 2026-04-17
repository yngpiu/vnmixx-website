import type { ListAttributesParams } from '@/lib/api/attributes';
import { ATTRIBUTE_TABLE_SORT_IDS } from '@/lib/data-table-sort-allowlists';
import type { PaginationState, SortingState } from '@tanstack/react-table';

const sortIds = ATTRIBUTE_TABLE_SORT_IDS as readonly string[];

export function toListAttributesParams(
  pagination: PaginationState,
  globalFilter: string,
  sorting: SortingState,
): ListAttributesParams {
  const search = globalFilter.trim() || undefined;
  const base: ListAttributesParams = {
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
