import type { ListCategoriesParams } from '@/lib/api/categories';
import type { ColumnFiltersState } from '@tanstack/react-table';

/** Map bộ lọc cột «Trạng thái xóa» sang query API (cùng quy ước employee / customer). */
export function toListCategoriesParams(columnFilters: ColumnFiltersState): ListCategoriesParams {
  const deletedFilter = columnFilters.find((f) => f.id === 'deleted');
  const delStatuses = Array.isArray(deletedFilter?.value) ? (deletedFilter.value as string[]) : [];
  let onlyDeleted: boolean | undefined;
  let isSoftDeleted: boolean | undefined;
  if (delStatuses.length === 1) {
    if (delStatuses[0] === 'deleted') {
      onlyDeleted = true;
    }
  } else if (delStatuses.length >= 2) {
    isSoftDeleted = true;
  }

  return {
    ...(onlyDeleted === true ? { onlyDeleted: true } : {}),
    ...(isSoftDeleted === true ? { isSoftDeleted: true } : {}),
  };
}
