'use client';

import { EmployeesRowActions } from '@/app/employees/employees-row-actions';
import {
  DataTableColumnHeader,
  dataTableSttColumnDef,
} from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { LongText } from '@/modules/common/components/long-text';
import { employeeAvatarDisplayUrl, initialsFromFullName } from '@/modules/common/utils/avatar';
import type { EmployeeListItem } from '@/modules/employees/types/employee';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function roleLabels(row: EmployeeListItem): string {
  return row.role?.name ?? '—';
}

export const employeesColumns: ColumnDef<EmployeeListItem>[] = [
  dataTableSttColumnDef<EmployeeListItem>(),
  {
    accessorKey: 'fullName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Họ tên" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 ps-0.5">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarImage
            src={employeeAvatarDisplayUrl(row.original.avatarUrl, row.original.email)}
            alt=""
          />
          <AvatarFallback className="text-[10px]">
            {initialsFromFullName(row.original.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <LongText className="max-w-40 md:max-w-56">
            <Link
              href={`/employees/${row.original.id}`}
              className="font-medium hover:underline underline-offset-4"
            >
              {row.original.fullName}
            </Link>
          </LongText>
          {row.original.deletedAt ? (
            <Badge variant="destructive" className="w-fit text-[10px]">
              Đã xóa
            </Badge>
          ) : null}
        </div>
      </div>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.08)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.06)]',
        'max-md:sticky start-0 md:drop-shadow-none',
      ),
      dataTableColumnLabel: 'Họ tên',
    } satisfies DataTableColumnMeta,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <LongText className="max-w-44 text-muted-foreground md:max-w-60">
        {row.original.email}
      </LongText>
    ),
    meta: { dataTableColumnLabel: 'Email' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'phoneNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
    cell: ({ row }) => <div className="tabular-nums">{row.getValue('phoneNumber')}</div>,
    meta: { dataTableColumnLabel: 'Điện thoại' } satisfies DataTableColumnMeta,
  },
  {
    id: 'roles',
    accessorFn: (row) => roleLabels(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vai trò" />,
    cell: ({ row }) => (
      <LongText className="max-w-36 md:max-w-48">{roleLabels(row.original)}</LongText>
    ),
    meta: { dataTableColumnLabel: 'Vai trò' } satisfies DataTableColumnMeta,
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái hoạt động" />,
    cell: ({ row }) =>
      row.original.status === 'ACTIVE' ? (
        <Badge
          variant="secondary"
          className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
        >
          Đang hoạt động
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
        >
          Vô hiệu hóa
        </Badge>
      ),
    filterFn: (row, _id, value) => {
      const statuses = (value as string[]) ?? [];
      if (statuses.length === 0 || statuses.length >= 2) {
        return true;
      }
      if (statuses.includes('active')) {
        return row.original.status === 'ACTIVE';
      }
      if (statuses.includes('inactive')) {
        return row.original.status === 'INACTIVE';
      }
      return true;
    },
    meta: { dataTableColumnLabel: 'Trạng thái hoạt động' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tạo lúc" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {createdAtFormatter.format(new Date(row.original.createdAt))}
      </span>
    ),
    meta: { dataTableColumnLabel: 'Tạo lúc' } satisfies DataTableColumnMeta,
  },
  {
    id: 'deleted',
    accessorFn: () => '',
    header: () => null,
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
    filterFn: () => true,
    meta: {
      className: 'hidden',
      thClassName: 'hidden',
      tdClassName: 'hidden',
      dataTableColumnLabel: 'Trạng thái xóa',
    } satisfies DataTableColumnMeta,
  },
  {
    id: 'actions',
    cell: ({ row }) => <EmployeesRowActions row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];
