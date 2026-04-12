import type { ListProductsParams } from '@/lib/api/products';
import type { ColumnFiltersState, PaginationState } from '@tanstack/react-table';

export function toListProductsParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  globalFilter: string,
): ListProductsParams {
  const search = globalFilter.trim() || undefined;

  const statusFilter = columnFilters.find((f) => f.id === 'isActive');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter.value as string[]) : [];
  let isActive: boolean | undefined;
  if (statuses.length === 1) {
    if (statuses[0] === 'active') isActive = true;
    else if (statuses[0] === 'inactive') isActive = false;
  }

  const catFilter = columnFilters.find((f) => f.id === 'categoryId');
  const catVals = Array.isArray(catFilter?.value) ? (catFilter.value as string[]) : [];
  let categoryId: number | undefined;
  const catRaw = catVals[0];
  if (catVals.length === 1 && typeof catRaw === 'string') {
    const n = Number.parseInt(catRaw, 10);
    if (Number.isFinite(n) && n >= 1) categoryId = n;
  }

  return {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };
}
