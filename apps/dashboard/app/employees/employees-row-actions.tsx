'use client';

import type { EmployeeListItem } from '@/lib/types/employee';
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
import { ExternalLinkIcon, MoreHorizontalIcon, Trash2Icon, UserPenIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type EmployeesRowActionsProps = {
  row: Row<EmployeeListItem>;
};

export function EmployeesRowActions({ row }: EmployeesRowActionsProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex size-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            href={`/employees/${row.original.id}`}
            className="flex cursor-default items-center gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0"
          >
            Chi tiết
            <DropdownMenuShortcut>
              <ExternalLinkIcon className="size-4" />
            </DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            toast.info('Chỉnh sửa nhân viên sẽ có trong bản cập nhật tới.');
          }}
        >
          Chỉnh sửa
          <DropdownMenuShortcut>
            <UserPenIcon className="size-4" />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            toast.info('Xóa nhân viên qua API sẽ được nối sau.');
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
