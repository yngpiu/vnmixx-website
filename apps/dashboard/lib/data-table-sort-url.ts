import type { SortingState } from '@tanstack/react-table';

/** Đọc `sortBy` + `sortOrder` từ URL; chỉ chấp nhận id cột nằm trong allowlist. */
export function sortingStateFromUrl(
  searchParams: URLSearchParams,
  allowedColumnIds: readonly string[],
): SortingState {
  const sortBy = searchParams.get('sortBy')?.trim();
  const sortOrder = searchParams.get('sortOrder');
  if (!sortBy || !allowedColumnIds.includes(sortBy)) return [];
  if (sortOrder !== 'asc' && sortOrder !== 'desc') return [];
  return [{ id: sortBy, desc: sortOrder === 'desc' }];
}

export function appendSortingToSearchParams(
  params: URLSearchParams,
  sorting: SortingState,
  allowedColumnIds: readonly string[],
): void {
  params.delete('sortBy');
  params.delete('sortOrder');
  const s = sorting[0];
  if (!s || !allowedColumnIds.includes(s.id)) return;
  params.set('sortBy', s.id);
  params.set('sortOrder', s.desc ? 'desc' : 'asc');
}
