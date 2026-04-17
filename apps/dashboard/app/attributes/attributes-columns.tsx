'use client';

import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import type { AttributeListItem } from '@/lib/types/attribute';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDownIcon,
  ListTreeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  TypeIcon,
} from 'lucide-react';

type AttributesColumnActions = {
  onEditName: (attributeId: number) => void;
  onEditValues: (attributeId: number) => void;
  onDelete: (row: AttributeListItem) => void;
};

const updatedFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function sortHeader(
  label: string,
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void },
) {
  const isSorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
    >
      {label}
      <ArrowUpDownIcon className="ml-2 size-4" />
    </Button>
  );
}

export function createAttributesColumns(
  actions: AttributesColumnActions,
): ColumnDef<AttributeListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => sortHeader('Tên', column),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      enableSorting: true,
      meta: { className: 'min-w-[220px]' } satisfies DataTableColumnMeta,
    },
    {
      id: 'valueCount',
      accessorFn: (row) => row.valueCount,
      header: ({ column }) => sortHeader('Số giá trị', column),
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.valueCount}</div>,
      enableSorting: true,
      meta: { className: 'w-[120px] text-center' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => sortHeader('Cập nhật', column),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {updatedFormatter.format(new Date(row.original.updatedAt))}
        </span>
      ),
      enableSorting: true,
      meta: {
        className: 'hidden lg:table-cell min-w-[180px]',
        thClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: '',
      cell: ({ row }) => (
        <div className="text-end">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0" type="button">
                <MoreHorizontalIcon className="size-4" />
                <span className="sr-only">Mở menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => actions.onEditName(row.original.id)}>
                Sửa tên
                <DropdownMenuShortcut>
                  <TypeIcon className="size-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEditValues(row.original.id)}>
                Sửa giá trị
                <DropdownMenuShortcut>
                  <ListTreeIcon className="size-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => actions.onDelete(row.original)}
              >
                Xóa
                <DropdownMenuShortcut>
                  <Trash2Icon className="size-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      meta: { className: 'w-[72px] text-end' } satisfies DataTableColumnMeta,
    },
  ];
}
