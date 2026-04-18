'use client';

import { ordersColumns } from '@/app/orders/orders-columns';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { InlineErrorAlert } from '@/components/inline-error-alert';
import { useOrdersListTableState } from '@/hooks/use-orders-list-table-state';
import { listAdminOrders } from '@/lib/api/orders';
import {
  ORDER_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
} from '@/lib/order-status-labels';
import { toListAdminOrdersParams } from '@/lib/orders-list-params';
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
  type VisibilityState,
} from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

const columns = ordersColumns;

export function OrdersTable() {
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    ensurePageInRange,
  } = useOrdersListTableState();
  const listParams = useMemo(
    () => toListAdminOrdersParams(pagination, columnFilters),
    [pagination, columnFilters],
  );
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orders', 'admin', 'list', listParams],
    queryFn: () => listAdminOrders(listParams),
    placeholderData: keepPreviousData,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);
  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      columnFilters,
      columnVisibility,
    },
    enableSorting: false,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.orderCode,
  });
  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);
  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách đơn hàng.';
    return <InlineErrorAlert message={message} />;
  }
  return (
    <div className={cn('flex flex-1 flex-col gap-4', isLoading && 'opacity-70')}>
      <DataTableToolbar
        table={table}
        searchPlaceholder="Mã đơn, tên, SĐT, mã GHN…"
        searchKey="orderCode"
        searchDebounceMs={350}
        filters={[
          {
            columnId: 'status',
            title: 'Trạng thái đơn',
            selectionMode: 'single',
            options: ORDER_STATUS_FILTER_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
          },
          {
            columnId: 'paymentStatus',
            title: 'Thanh toán',
            selectionMode: 'single',
            options: PAYMENT_STATUS_FILTER_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
          },
        ]}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => {
                  const hm = headMeta(header);
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted',
                        hm.className,
                        hm.thClassName,
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
                    const cm = cellMeta(cell);
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'bg-background group-hover/row:bg-muted',
                          cm.className,
                          cm.tdClassName,
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
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isLoading ? 'Đang tải…' : 'Không có đơn hàng phù hợp.'}
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
