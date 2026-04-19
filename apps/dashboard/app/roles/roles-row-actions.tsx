'use client';

import type { RoleListItem } from '@/types/rbac';
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
import { MoreHorizontalIcon, PencilIcon, ScanEyeIcon, Trash2Icon } from 'lucide-react';

type RolesRowActionsProps = {
  row: Row<RoleListItem>;
  onDetail: (role: RoleListItem) => void;
  onEdit: (role: RoleListItem) => void;
  onDelete: (role: RoleListItem) => void;
};

export function RolesRowActions({ row, onDetail, onEdit, onDelete }: RolesRowActionsProps) {
  const r = row.original;
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onDetail(r)}>
          Chi tiết
          <DropdownMenuShortcut>
            <ScanEyeIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(r)}>
          Sửa
          <DropdownMenuShortcut>
            <PencilIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            onDelete(r);
          }}
        >
          Xóa
          <DropdownMenuShortcut>
            <Trash2Icon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
