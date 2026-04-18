'use client';

import { RolesRowActions } from '@/app/roles/roles-row-actions';
import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import type { RoleListItem } from '@/lib/types/rbac';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

const updatedFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export type RolesColumnHandlers = {
  onDetail: (role: RoleListItem) => void;
  onEdit: (role: RoleListItem) => void;
  onDelete: (role: RoleListItem) => void;
};

export function createRolesColumns(handlers: RolesColumnHandlers): ColumnDef<RoleListItem>[] {
  return [
    dataTableSttColumnDef<RoleListItem>(),
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
      cell: ({ row }) => (
        <Link
          href={`/roles/${row.original.id}`}
          className="font-medium hover:underline underline-offset-4"
        >
          {row.original.name}
        </Link>
      ),
      meta: { dataTableColumnLabel: 'Tên' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mô tả" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-xs truncate">
          {row.original.description ?? '—'}
        </span>
      ),
      enableSorting: false,
      meta: {
        dataTableColumnLabel: 'Mô tả',
        className: 'hidden md:table-cell',
        thClassName: 'hidden md:table-cell',
        tdClassName: 'hidden md:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'permissionCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Số quyền" />,
      cell: ({ row }) => (
        <div className="text-center tabular-nums">{row.original.permissionCount}</div>
      ),
      meta: { dataTableColumnLabel: 'Số quyền' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {updatedFormatter.format(new Date(row.original.updatedAt))}
        </span>
      ),
      meta: {
        dataTableColumnLabel: 'Cập nhật',
        className: 'hidden lg:table-cell',
        thClassName: 'hidden lg:table-cell',
        tdClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row }) => <RolesRowActions row={row} {...handlers} />,
      meta: {
        className: cn('w-12 text-end'),
        thClassName: 'w-12 text-end',
        tdClassName: 'text-end',
      } satisfies DataTableColumnMeta,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
