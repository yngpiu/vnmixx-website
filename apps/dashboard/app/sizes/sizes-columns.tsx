'use client';

import { SizesRowActions } from '@/app/sizes/sizes-row-actions';
import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import type { SizeAdmin } from '@/lib/types/size';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const updatedFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export type SizesColumnHandlers = {
  onEdit: (size: SizeAdmin) => void;
  onDelete: (size: SizeAdmin) => void;
};

export function createSizesColumns(handlers: SizesColumnHandlers): ColumnDef<SizeAdmin>[] {
  return [
    dataTableSttColumnDef<SizeAdmin>(),
    {
      accessorKey: 'label',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nhãn" />,
      cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
      meta: { dataTableColumnLabel: 'Nhãn' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'sortOrder',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Thứ tự" />,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.sortOrder}</div>,
      meta: { dataTableColumnLabel: 'Thứ tự' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {updatedFormatter.format(new Date(row.original.updatedAt))}
        </span>
      ),
      meta: {
        dataTableColumnLabel: 'Cập nhật',
        className: 'hidden lg:table-cell',
        thClassName: 'hidden lg:table-cell',
        tdClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row }) => <SizesRowActions row={row} {...handlers} />,
      meta: {
        className: cn('w-12 text-end'),
        thClassName: 'w-12 text-end',
        tdClassName: 'text-end',
      } satisfies DataTableColumnMeta,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
