'use client';

import { ordersColumns } from '@/app/orders/orders-columns';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { listAdminOrders } from '@/modules/orders/api/orders';
import {
  ORDER_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
} from '@/modules/orders/utils/order-status-labels';
import { toListAdminOrdersParams } from '@/modules/orders/utils/orders-list-params';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table';
import { AlertCircleIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

type CustomerOrdersSectionProps = {
  customerId: number;
};

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

export function CustomerOrdersSection({ customerId }: CustomerOrdersSectionProps) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const listParams = useMemo(
    () => ({
      ...toListAdminOrdersParams(pagination, columnFilters, []),
      customerId,
    }),
    [customerId, pagination, columnFilters],
  );
  const ordersQuery = useQuery({
    queryKey: ['orders', 'admin', 'customer-list', listParams],
    queryFn: () => listAdminOrders(listParams),
    placeholderData: keepPreviousData,
  });
  const table = useReactTable({
    data: ordersQuery.data?.data ?? [],
    columns: ordersColumns,
    pageCount: Math.max(ordersQuery.data?.meta.totalPages ?? 1, 1),
    state: {
      pagination,
      columnFilters,
      columnVisibility,
    },
    enableSorting: false,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: (next) => {
      const value = typeof next === 'function' ? next(columnFilters) : next;
      setColumnFilters(value);
      setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.orderCode,
  });
  if (ordersQuery.isError) {
    const message =
      ordersQuery.error instanceof Error
        ? ordersQuery.error.message
        : 'Không tải được danh sách đơn hàng.';
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <p>{message}</p>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-1 flex-col gap-4', ordersQuery.isLoading && 'opacity-70')}>
      <DataTableToolbar
        table={table}
        searchHelpTooltip="Tìm theo mã đơn, tên khách, số điện thoại hoặc mã vận đơn GHN."
        searchKey="orderCode"
        searchDebounceMs={350}
        filters={[
          {
            columnId: 'status',
            title: 'Trạng thái đơn',
            selectionMode: 'single',
            options: ORDER_STATUS_FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            })),
          },
          {
            columnId: 'paymentStatus',
            title: 'Thanh toán',
            selectionMode: 'single',
            options: PAYMENT_STATUS_FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            })),
          },
        ]}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => {
                  const meta = headMeta(header);
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted',
                        meta.className,
                        meta.thClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group/row">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cellMeta(cell);
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'bg-background group-hover/row:bg-muted',
                          meta.className,
                          meta.tdClassName,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={ordersColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {ordersQuery.isLoading ? 'Đang tải…' : 'Không có đơn hàng phù hợp.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className="mt-auto" />
    </div>
  );
}
