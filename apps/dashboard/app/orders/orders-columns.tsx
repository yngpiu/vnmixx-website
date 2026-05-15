'use client';

import { OrdersRowActions } from '@/app/orders/orders-row-actions';
import {
  DataTableColumnHeader,
  dataTableSttColumnDef,
} from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { LongText } from '@/modules/common/components/long-text';
import { formatVnd } from '@/modules/common/utils/format-vnd';
import { getAdminOrder } from '@/modules/orders/api/orders';
import type { OrderAdminListItem } from '@/modules/orders/types/order-admin';
import {
  getOrderStatusBadgeClassName,
  getOrderStatusLabel,
  getPaymentStatusBadgeClassName,
  getPaymentStatusLabel,
} from '@/modules/orders/utils/order-status-labels';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function paymentMethodLabel(method: OrderAdminListItem['paymentMethod']): string {
  if (method === 'COD') return 'COD';
  if (method === 'BANK_TRANSFER_QR') return 'Chuyển khoản QR';
  return '—';
}

function PaymentMethodCell({ order }: { order: OrderAdminListItem }): React.JSX.Element {
  const detailQuery = useQuery({
    queryKey: ['orders', 'admin', 'detail', order.orderCode, 'payment-method'],
    queryFn: () => getAdminOrder(order.orderCode),
    enabled: order.paymentMethod == null,
    staleTime: 60_000,
  });
  const paymentMethod =
    order.paymentMethod ?? order.payment?.method ?? detailQuery.data?.payments[0]?.method ?? null;
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {paymentMethodLabel(paymentMethod)}
    </span>
  );
}

export const ordersColumns: ColumnDef<OrderAdminListItem>[] = [
  dataTableSttColumnDef<OrderAdminListItem>(),
  {
    accessorKey: 'orderCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => (
      <LongText className="max-w-32 font-mono text-xs md:max-w-40">
        <Link
          href={`/orders/${encodeURIComponent(row.original.orderCode)}`}
          className="font-medium hover:underline underline-offset-4"
        >
          {row.original.orderCode}
        </Link>
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
        <LongText className="max-w-36 md:max-w-48">
          <Link
            href={`/customers/${row.original.customer.id}`}
            className="font-medium hover:underline underline-offset-4"
          >
            {row.original.customer.fullName}
          </Link>
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
    accessorKey: 'paymentMethod',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phương thức thanh toán" />
    ),
    cell: ({ row }) => <PaymentMethodCell order={row.original} />,
    meta: { dataTableColumnLabel: 'Phương thức thanh toán' } satisfies DataTableColumnMeta,
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
    id: 'actions',
    cell: ({ row }) => <OrdersRowActions order={row.original} />,
    meta: {
      className: cn('max-md:sticky end-0 z-10 rounded-tr-[inherit]'),
      thClassName: 'rounded-tr-[inherit]',
    } satisfies DataTableColumnMeta,
  },
];
