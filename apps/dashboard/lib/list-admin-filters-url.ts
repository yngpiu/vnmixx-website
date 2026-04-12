import type { ColumnFiltersState } from '@tanstack/react-table';

/** Đọc `?isActive=true|false`. */
export function parseIsActiveColumnFilter(searchParams: URLSearchParams): {
  id: 'isActive';
  value: string[];
} | null {
  const ia = searchParams.get('isActive');
  if (ia === 'true') return { id: 'isActive', value: ['active'] };
  if (ia === 'false') return { id: 'isActive', value: ['inactive'] };
  return null;
}

/** Ghi `isActive=true|false`; bỏ qua khi chọn cả hai hoặc không lọc. */
export function setIsActiveUrlParam(
  params: URLSearchParams,
  columnFilters: ColumnFiltersState,
): void {
  const statusFilter = columnFilters.find((f) => f.id === 'isActive');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter.value as string[]) : [];
  if (statuses.length !== 1) return;
  if (statuses[0] === 'active') params.set('isActive', 'true');
  else if (statuses[0] === 'inactive') params.set('isActive', 'false');
}

/** Đọc `?isSoftDeleted=true|false`. */
export function parseDeletedColumnFilter(searchParams: URLSearchParams): {
  id: 'deleted';
  value: string[];
} | null {
  const raw = searchParams.get('isSoftDeleted');
  if (raw === 'true') return { id: 'deleted', value: ['deleted'] };
  if (raw === 'false') return { id: 'deleted', value: ['not_deleted'] };
  return null;
}

/** Ghi `isSoftDeleted=true|false`; bỏ qua khi chọn cả hai (API không lọc). */
export function setSoftDeletedUrlParam(
  params: URLSearchParams,
  columnFilters: ColumnFiltersState,
): void {
  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delVals = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  if (delVals.length >= 2) return;
  if (delVals.length === 1) {
    params.set('isSoftDeleted', delVals[0] === 'deleted' ? 'true' : 'false');
  }
}
