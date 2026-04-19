'use client';

import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { Column, Table } from '@tanstack/react-table';
import { SlidersHorizontal } from 'lucide-react';

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>;
};

function columnMenuLabel<TData>(column: Column<TData, unknown>): string {
  const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
  return meta?.dataTableColumnLabel ?? column.id;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ms-auto hidden h-8 lg:flex">
          <SlidersHorizontal className="size-4" />
          Cột hiển thị
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ẩn / hiện cột</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) => column.getCanHide() && column.id !== 'select' && column.id !== 'actions',
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {columnMenuLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
