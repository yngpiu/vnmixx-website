'use client';

import type { ColorAdmin } from '@/lib/types/color';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { Row } from '@tanstack/react-table';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';

type ColorsRowActionsProps = {
  row: Row<ColorAdmin>;
  onEdit: (color: ColorAdmin) => void;
  onDelete: (color: ColorAdmin) => void;
};

export function ColorsRowActions({ row, onEdit, onDelete }: ColorsRowActionsProps) {
  const c = row.original;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex size-8 p-0 data-[state=open]:bg-muted"
          type="button"
        >
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(c)}>
          Sửa
          <DropdownMenuShortcut>
            <PencilIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(c)}>
          Xóa
          <DropdownMenuShortcut>
            <Trash2Icon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
