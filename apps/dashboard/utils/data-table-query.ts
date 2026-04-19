import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export type BaseListParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Trích xuất các tham số phân trang và sắp xếp cơ bản từ state của TanStack Table.
 */
export function getBaseListParams(
  pagination: PaginationState,
  sorting: SortingState,
  allowedSortIds: readonly string[],
): BaseListParams {
  const base: BaseListParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  };

  const s = sorting[0];
  if (s && allowedSortIds.includes(s.id)) {
    base.sortBy = s.id;
    base.sortOrder = s.desc ? 'desc' : 'asc';
  }

  return base;
}

/**
 * An toàn trích xuất chuỗi tìm kiếm từ bộ lọc cột (columnFilters).
 */
export function getSearchQuery(
  columnFilters: ColumnFiltersState,
  columnId: string,
): string | undefined {
  const filter = columnFilters.find((f) => f.id === columnId);
  if (typeof filter?.value === 'string') {
    return filter.value.trim() || undefined;
  }
  return undefined;
}

/**
 * Trích xuất một giá trị duy nhất từ bộ lọc dạng faceted (chọn từ danh sách).
 */
export function getSingleFacetedValue(
  columnFilters: ColumnFiltersState,
  columnId: string,
): string | undefined {
  const filter = columnFilters.find((f) => f.id === columnId);
  const values = Array.isArray(filter?.value) ? (filter.value as string[]) : [];
  if (values.length !== 1) {
    return undefined;
  }
  return values[0];
}
