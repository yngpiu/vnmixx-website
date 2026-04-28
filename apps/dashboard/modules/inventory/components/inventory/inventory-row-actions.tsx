'use client';

import type { InventoryListItem } from '@/modules/inventory/types/inventory';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { Row } from '@tanstack/react-table';
import { ArrowDownLeftIcon, ArrowUpRightIcon, MoreHorizontalIcon } from 'lucide-react';

type InventoryRowActionsProps = {
  row: Row<InventoryListItem>;
  onImportStock: (item: InventoryListItem) => void;
  onExportStock: (item: InventoryListItem) => void;
};

export function InventoryRowActions({
  row,
  onImportStock,
  onExportStock,
}: InventoryRowActionsProps) {
  const inventory = row.original;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex size-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onImportStock(inventory)}>
          Nhập hàng
          <DropdownMenuShortcut>
            <ArrowDownLeftIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExportStock(inventory)}>
          Xuất hàng
          <DropdownMenuShortcut>
            <ArrowUpRightIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
