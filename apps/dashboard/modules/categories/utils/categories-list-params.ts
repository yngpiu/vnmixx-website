import type { ListCategoriesParams } from '@/modules/categories/api/categories';
import { getSingleFacetedValue } from '@/modules/common/utils/data-table-query';
import { isSoftDeletedFromDeletedColumnFilter } from '@/modules/common/utils/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState } from '@tanstack/react-table';

/** Map bộ lọc cột sang query API. `isSoftDeleted` mặc định false (ẩn đã xóa mềm) trừ khi chọn «cả hai». */
export function toListCategoriesParams(columnFilters: ColumnFiltersState): ListCategoriesParams {
  const statusRaw = getSingleFacetedValue(columnFilters, 'isActive');
  const isActive = statusRaw === 'active' ? true : statusRaw === 'inactive' ? false : undefined;

  const delStatuses = (columnFilters.find((f) => f.id === 'deleted')?.value as string[]) ?? [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
