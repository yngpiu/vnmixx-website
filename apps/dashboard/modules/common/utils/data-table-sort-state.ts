import type { SortingState } from '@tanstack/react-table';

/**
 * Keeps at most one sort column and drops unknown column ids (same validation as former URL parsing).
 */
export function normalizeSortingState(
  sorting: SortingState,
  allowedColumnIds: readonly string[],
): SortingState {
  const first = sorting[0];
  if (!first || !allowedColumnIds.includes(first.id)) {
    return [];
  }
  return [{ id: first.id, desc: Boolean(first.desc) }];
}
