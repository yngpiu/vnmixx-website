/**
 * Gắn vào `ColumnDef.meta` (TanStack Table) để layout / menu cột dùng chung.
 */
export type DataTableColumnMeta = {
  className?: string;
  thClassName?: string;
  tdClassName?: string;
  /** Tên hiển thị trong menu «Ẩn / hiện cột» (mặc định: `column.id`). */
  dataTableColumnLabel?: string;
};
