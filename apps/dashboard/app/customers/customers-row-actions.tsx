'use client';

import { useCustomersTableActions } from '@/app/customers/customers-table-actions-context';
import type { CustomerListItem } from '@/lib/types/customer';
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
import {
  ExternalLinkIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  ScanEyeIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon,
} from 'lucide-react';
import Link from 'next/link';

type CustomersRowActionsProps = {
  row: Row<CustomerListItem>;
};

export function CustomersRowActions({ row }: CustomersRowActionsProps) {
  const { openCustomerDetail, openToggleActive, openDeleteCustomer, openRestoreCustomer } =
    useCustomersTableActions();
  const isDeleted = Boolean(row.original.deletedAt);
  const isActive = row.original.isActive;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex size-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isDeleted ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/customers/${row.original.id}`}>
                Trang chi tiết
                <DropdownMenuShortcut>
                  <ExternalLinkIcon className="size-4" />
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openCustomerDetail(row.original);
              }}
            >
              Xem nhanh
              <DropdownMenuShortcut>
                <ScanEyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openRestoreCustomer(row.original);
              }}
            >
              Khôi phục
              <DropdownMenuShortcut>
                <RotateCcwIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/customers/${row.original.id}`}>
                Trang chi tiết
                <DropdownMenuShortcut>
                  <ExternalLinkIcon className="size-4" />
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openCustomerDetail(row.original);
              }}
            >
              Xem nhanh
              <DropdownMenuShortcut>
                <ScanEyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openToggleActive(row.original);
              }}
            >
              {isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
              <DropdownMenuShortcut>
                {isActive ? (
                  <UserRoundXIcon className="size-4" />
                ) : (
                  <UserRoundCheckIcon className="size-4" />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                openDeleteCustomer(row.original);
              }}
            >
              Xóa
              <DropdownMenuShortcut>
                <Trash2Icon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
