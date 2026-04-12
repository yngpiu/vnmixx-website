'use client';

import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

/** STT theo trang: `(pageIndex + 1)` trang, offset `(pageIndex * pageSize + row.index + 1)`. */
export function dataTableSttColumnDef<T>(): ColumnDef<T> {
  return {
    id: 'stt',
    header: () => (
      <span className="text-muted-foreground text-xs font-medium tabular-nums">STT</span>
    ),
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination;
      const n = pageIndex * pageSize + row.index + 1;
      return <span className="text-muted-foreground text-sm tabular-nums">{n}</span>;
    },
    enableSorting: false,
    enableHiding: false,
    meta: {
      dataTableColumnLabel: 'STT',
      className: cn('w-10 min-w-10 max-w-10 px-1 text-center'),
      thClassName: cn('w-10 min-w-10 max-w-10 px-1 text-center'),
      tdClassName: cn('w-10 min-w-10 max-w-10 px-1 text-center'),
    } satisfies DataTableColumnMeta,
  };
}
