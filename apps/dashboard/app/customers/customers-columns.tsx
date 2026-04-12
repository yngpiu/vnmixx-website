'use client';

import { CustomersRowActions } from '@/app/customers/customers-row-actions';
import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { LongText } from '@/components/long-text';
import { employeeAvatarDisplayUrl, initialsFromFullName } from '@/lib/avatar';
import type { CustomerGender, CustomerListItem } from '@/lib/types/customer';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function genderLabel(g: CustomerGender | null): string {
  if (g === 'MALE') return 'Nam';
  if (g === 'FEMALE') return 'Nữ';
  if (g === 'OTHER') return 'Khác';
  return '—';
}

export const customersColumns: ColumnDef<CustomerListItem>[] = [
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
    } satisfies DataTableColumnMeta,
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
  dataTableSttColumnDef<CustomerListItem>(),
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
          <LongText className="max-w-40 font-medium md:max-w-56">{row.original.fullName}</LongText>
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
        'max-md:sticky start-8 md:drop-shadow-none',
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
    id: 'gender',
    accessorFn: (row) => genderLabel(row.gender),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{genderLabel(row.original.gender)}</span>
    ),
    meta: { dataTableColumnLabel: 'Giới tính' } satisfies DataTableColumnMeta,
    enableSorting: false,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái hoạt động" />,
    cell: ({ row }) =>
      row.original.isActive ? (
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
        return row.original.isActive === true;
      }
      if (statuses.includes('inactive')) {
        return row.original.isActive === false;
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
    cell: ({ row }) => <CustomersRowActions row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];
