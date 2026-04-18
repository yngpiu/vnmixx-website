'use client';

import { OrdersRowActions } from '@/app/orders/orders-row-actions';
import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { LongText } from '@/components/long-text';
import { formatVnd } from '@/lib/format-vnd';
import {
  getOrderStatusBadgeClassName,
  getOrderStatusLabel,
  getPaymentStatusBadgeClassName,
  getPaymentStatusLabel,
} from '@/lib/order-status-labels';
import type { OrderAdminListItem } from '@/lib/types/order-admin';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export const ordersColumns: ColumnDef<OrderAdminListItem>[] = [
  dataTableSttColumnDef<OrderAdminListItem>(),
  {
    accessorKey: 'orderCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => (
      <LongText className="max-w-32 font-mono text-xs font-medium md:max-w-40">
        {row.original.orderCode}
      </LongText>
    ),
    meta: {
      dataTableColumnLabel: 'Mã đơn',
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.08)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.06)]',
        'max-md:sticky start-0 md:drop-shadow-none',
      ),
    } satisfies DataTableColumnMeta,
    enableHiding: false,
  },
  {
    id: 'customer',
    accessorFn: (row) => row.customer.fullName,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Khách hàng" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <LongText className="max-w-36 font-medium md:max-w-48">
          {row.original.customer.fullName}
        </LongText>
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.customer.phoneNumber}
        </span>
      </div>
    ),
    meta: { dataTableColumnLabel: 'Khách hàng' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'total',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tổng tiền" />,
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{formatVnd(row.original.total)}</span>
    ),
    meta: { dataTableColumnLabel: 'Tổng tiền' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái đơn" />,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn('whitespace-nowrap', getOrderStatusBadgeClassName(row.original.status))}
      >
        {getOrderStatusLabel(row.original.status)}
      </Badge>
    ),
    meta: { dataTableColumnLabel: 'Trạng thái đơn' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'paymentStatus',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thanh toán" />,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'whitespace-nowrap',
          getPaymentStatusBadgeClassName(row.original.paymentStatus),
        )}
      >
        {getPaymentStatusLabel(row.original.paymentStatus)}
      </Badge>
    ),
    meta: { dataTableColumnLabel: 'Thanh toán' } satisfies DataTableColumnMeta,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày tạo" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {createdAtFormatter.format(new Date(row.original.createdAt))}
      </span>
    ),
    meta: { dataTableColumnLabel: 'Ngày tạo' } satisfies DataTableColumnMeta,
  },
  {
    id: 'itemsCount',
    accessorFn: (row) => row.items.length,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dòng hàng" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.items.length}</span>,
    meta: { dataTableColumnLabel: 'Dòng hàng' } satisfies DataTableColumnMeta,
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrdersRowActions order={row.original} />,
    meta: {
      className: cn('max-md:sticky end-0 z-10 rounded-tr-[inherit]'),
      thClassName: 'rounded-tr-[inherit]',
    } satisfies DataTableColumnMeta,
  },
];
