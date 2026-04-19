import type { ListCategoriesParams } from '@/lib/api/categories';
import { isSoftDeletedFromDeletedColumnFilter } from '@/utils/list-soft-deleted-from-column-filter';
import type { ColumnFiltersState } from '@tanstack/react-table';

/** Map bộ lọc cột sang query API. `isSoftDeleted` mặc định false (ẩn đã xóa mềm) trừ khi chọn «cả hai». */
export function toListCategoriesParams(columnFilters: ColumnFiltersState): ListCategoriesParams {
  const activeFilter = columnFilters.find((f) => f.id === 'isActive');
  const actVals = Array.isArray(activeFilter?.value) ? (activeFilter.value as string[]) : [];
  let isActive: boolean | undefined;
  if (actVals.length === 1) {
    if (actVals[0] === 'active') isActive = true;
    else if (actVals[0] === 'inactive') isActive = false;
  }

  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delStatuses = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  const isSoftDeleted = isSoftDeletedFromDeletedColumnFilter(delStatuses);

  return {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(isSoftDeleted !== undefined ? { isSoftDeleted } : {}),
  };
}
