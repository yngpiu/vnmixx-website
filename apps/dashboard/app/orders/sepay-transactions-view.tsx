'use client';

import { ListPage } from '@/modules/common/components/list-page';
import { formatVnd } from '@/modules/common/utils/format-vnd';
import { listAdminSepayTransactions } from '@/modules/orders/api/orders';
import type { SepayTransactionAdmin } from '@/modules/orders/types/order-admin';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowRightIcon, Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const createdAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function matchStatusLabel(status: SepayTransactionAdmin['matchStatus']): string {
  switch (status) {
    case 'MATCHED':
      return 'Đã khớp';
    case 'IGNORED':
      return 'Bỏ qua';
    case 'UNMATCHED':
    default:
      return 'Chưa khớp';
  }
}

function matchStatusClassName(status: SepayTransactionAdmin['matchStatus']): string {
  switch (status) {
    case 'MATCHED':
      return 'border-transparent bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-100 dark:hover:bg-emerald-900/60';
    case 'IGNORED':
      return 'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700';
    case 'UNMATCHED':
    default:
      return 'border-transparent bg-sky-50 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/70 dark:text-sky-100 dark:hover:bg-sky-900/60';
  }
}

const columns: ColumnDef<SepayTransactionAdmin>[] = [
  {
    accessorKey: 'sepayTransactionId',
    header: 'Mã GD',
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">{row.original.sepayTransactionId}</span>
    ),
  },
  {
    accessorKey: 'orderCode',
    header: 'Đơn hàng',
    cell: ({ row }) => {
      const code = row.original.orderCode ?? row.original.matchedOrderCode;
      return code ? (
        <Link href={`/orders/${encodeURIComponent(code)}`} className="font-medium hover:underline">
          {code}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: 'transferAmount',
    header: () => <span className="text-end">Số tiền</span>,
    cell: ({ row }) => (
      <span className="block text-end tabular-nums font-medium">
        {formatVnd(row.original.transferAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'matchStatus',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
          matchStatusClassName(row.original.matchStatus),
        )}
      >
        {matchStatusLabel(row.original.matchStatus)}
      </span>
    ),
  },
  {
    accessorKey: 'content',
    header: 'Nội dung',
    cell: ({ row }) => (
      <span className="block max-w-[28rem] truncate text-muted-foreground">
        {row.original.content}
      </span>
    ),
  },
  {
    accessorKey: 'receivedAt',
    header: 'Nhận lúc',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {createdAtFormatter.format(new Date(row.original.receivedAt))}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.orderCode ? (
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href={`/orders/${encodeURIComponent(row.original.orderCode)}`}>
            Chi tiết
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      ) : null,
  },
];

export function SepayTransactionsView(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [search]);

  const query = useQuery({
    queryKey: [
      'orders',
      'admin',
      'sepay-transactions',
      pagination.pageIndex,
      pagination.pageSize,
      search,
    ],
    queryFn: () =>
      listAdminSepayTransactions({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const pageCount = Math.max(query.data?.meta?.totalPages ?? 1, 1);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { pagination },
    manualPagination: true,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const emptyMessage = search.trim()
    ? 'Không có giao dịch khớp bộ lọc.'
    : 'Chưa có giao dịch SePay nào.';

  if (query.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : 'Không tải được lịch sử giao dịch.'}
      </div>
    );
  }

  return (
    <ListPage title="Lịch sử giao dịch SePay">
      <div className={cn('flex flex-1 flex-col gap-4', query.isLoading && 'opacity-70')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, mã tham chiếu hoặc nội dung..."
            className="sm:max-w-md"
          />
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground sm:ms-auto inline-flex items-center gap-2">
              <Loader2Icon className="size-4 animate-spin" />
              Đang tải...
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-background transition-colors">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 px-4 text-center text-muted-foreground"
                    >
                      {query.isLoading ? 'Đang tải…' : emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Trang {pagination.pageIndex + 1} / {pageCount} · Tổng {query.data?.meta?.total ?? 0}{' '}
            giao dịch
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </ListPage>
  );
}
