'use client';

import { ColorsRowActions } from '@/app/colors/colors-row-actions';
import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import type { ColorAdmin } from '@/types/color';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const updatedFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export type ColorsColumnHandlers = {
  onEdit: (color: ColorAdmin) => void;
  onDelete: (color: ColorAdmin) => void;
};

export function createColorsColumns(handlers: ColorsColumnHandlers): ColumnDef<ColorAdmin>[] {
  return [
    dataTableSttColumnDef<ColorAdmin>(),
    {
      id: 'swatch',
      header: () => <span className="sr-only">Màu</span>,
      cell: ({ row }) => (
        <span
          className="inline-block size-8 rounded-md border shadow-sm"
          style={{ backgroundColor: row.original.hexCode }}
          title={row.original.hexCode}
        />
      ),
      meta: {
        className: 'w-14',
        thClassName: 'w-14',
        tdClassName: 'w-14',
      } satisfies DataTableColumnMeta,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { dataTableColumnLabel: 'Tên' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'hexCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="HEX" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-sm">
          {row.original.hexCode.toUpperCase()}
        </span>
      ),
      meta: {
        dataTableColumnLabel: 'HEX',
        className: 'hidden sm:table-cell',
        thClassName: 'hidden sm:table-cell',
        tdClassName: 'hidden sm:table-cell',
      } satisfies DataTableColumnMeta,
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
      cell: ({ row }) => <ColorsRowActions row={row} {...handlers} />,
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
