'use client';

import { CustomersBulkActions } from '@/app/customers/customers-bulk-actions';
import { customersColumns } from '@/app/customers/customers-columns';
import { CustomersTableActionsProvider } from '@/app/customers/customers-table-actions-context';
import { CustomerDetailDialog } from '@/components/customers/customer-detail-dialog';
import {
  EditCustomerDialog,
  type CustomerDialogMode,
} from '@/components/customers/edit-customer-dialog';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { useCustomersListUrlState } from '@/hooks/use-customers-list-url-state';
import { listCustomers } from '@/lib/api/customers';
import { toListCustomersParams } from '@/lib/customers-list-params';
import type { CustomerListItem } from '@/lib/types/customer';
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
import { AlertCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

const columns = customersColumns;

export function CustomersTable() {
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useCustomersListUrlState();

  const listParams = useMemo(
    () => toListCustomersParams(pagination, columnFilters, sorting),
    [pagination, columnFilters, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customers', 'list', listParams],
    queryFn: () => listCustomers(listParams),
    placeholderData: keepPreviousData,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [customerDialog, setCustomerDialog] = useState<{
    id: number;
    mode: CustomerDialogMode;
  } | null>(null);
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);

  const openCustomerDetail = useCallback((customer: CustomerListItem) => {
    setDetailCustomerId(customer.id);
  }, []);

  const openToggleActive = useCallback((customer: CustomerListItem) => {
    setCustomerDialog({ id: customer.id, mode: 'active' });
  }, []);

  const openDeleteCustomer = useCallback((customer: CustomerListItem) => {
    setCustomerDialog({ id: customer.id, mode: 'delete' });
  }, []);

  const openRestoreCustomer = useCallback((customer: CustomerListItem) => {
    setCustomerDialog({ id: customer.id, mode: 'restore' });
  }, []);

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
      sorting,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách khách hàng.';
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
    <CustomersTableActionsProvider
      openCustomerDetail={openCustomerDetail}
      openToggleActive={openToggleActive}
      openDeleteCustomer={openDeleteCustomer}
      openRestoreCustomer={openRestoreCustomer}
    >
      <div
        className={cn(
          'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
          isLoading && 'opacity-70',
        )}
      >
        <DataTableToolbar
          table={table}
          searchPlaceholder="Tìm theo tên, email, SĐT…"
          searchKey="fullName"
          searchDebounceMs={350}
          filters={[
            {
              columnId: 'isActive',
              title: 'Trạng thái',
              selectionMode: 'single',
              options: [
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Vô hiệu hóa', value: 'inactive' },
              ],
            },
            {
              columnId: 'deleted',
              title: 'Trạng thái xóa',
              selectionMode: 'single',
              options: [
                { label: 'Chưa xóa', value: 'not_deleted' },
                { label: 'Đã xóa', value: 'deleted' },
              ],
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
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="group/row"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cm = cellMeta(cell);
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
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
                    {isLoading ? 'Đang tải…' : 'Không có khách hàng phù hợp.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="mt-auto" />
        <CustomersBulkActions table={table} />
      </div>
      <CustomerDetailDialog
        customerId={detailCustomerId}
        open={detailCustomerId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailCustomerId(null);
        }}
      />
      <EditCustomerDialog
        customerId={customerDialog?.id ?? null}
        mode={customerDialog?.mode ?? null}
        open={customerDialog !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCustomerDialog(null);
        }}
      />
    </CustomersTableActionsProvider>
  );
}
