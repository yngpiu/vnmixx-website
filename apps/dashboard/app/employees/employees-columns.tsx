'use client';

import { EmployeesRowActions } from '@/app/employees/employees-row-actions';
import { DataTableColumnHeader } from '@/components/data-table';
import { LongText } from '@/components/long-text';
import type { EmployeeListItem } from '@/lib/types/employee';
import { Badge } from '@repo/ui/components/ui/badge';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function roleLabels(row: EmployeeListItem): string {
  return row.employeeRoles.map((er) => er.role.name).join(', ') || '—';
}

export const employeesColumns: ColumnDef<EmployeeListItem>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Chọn tất cả trên trang"
        className="translate-y-0.5"
      />
    ),
    meta: {
      className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Chọn dòng"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'fullName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Họ tên" />,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 ps-0.5">
        <LongText className="max-w-40 font-medium md:max-w-56">{row.original.fullName}</LongText>
        {row.original.deletedAt ? (
          <Badge variant="destructive" className="w-fit text-[10px]">
            Đã xóa
          </Badge>
        ) : null}
      </div>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.08)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.06)]',
        'max-md:sticky start-8 md:drop-shadow-none',
      ),
    },
    enableSorting: false,
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
    enableSorting: false,
  },
  {
    accessorKey: 'phoneNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
    cell: ({ row }) => <div className="tabular-nums">{row.getValue('phoneNumber')}</div>,
    enableSorting: false,
  },
  {
    id: 'roles',
    accessorFn: (row) => roleLabels(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vai trò" />,
    cell: ({ row }) => (
      <LongText className="max-w-36 capitalize md:max-w-48">{roleLabels(row.original)}</LongText>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="secondary">Hoạt động</Badge>
      ) : (
        <Badge variant="outline">Ngưng</Badge>
      ),
    filterFn: (row, _id, value) => {
      const statuses = (value as string[]) ?? [];
      if (statuses.length === 0 || statuses.length >= 2) {
        return true;
      }
      if (statuses.includes('active')) {
        return row.original.isActive === true;
      }
      if (statuses.includes('inactive')) {
        return row.original.isActive === false;
      }
      return true;
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tạo lúc" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {createdAtFormatter.format(new Date(row.original.createdAt))}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'archive',
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
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <EmployeesRowActions row={row} />,
    enableHiding: false,
  },
];
