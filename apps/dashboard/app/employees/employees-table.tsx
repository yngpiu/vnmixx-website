'use client';

import { EmployeesBulkActions } from '@/app/employees/employees-bulk-actions';
import { employeesColumns } from '@/app/employees/employees-columns';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import { useEmployeesListUrlState } from '@/hooks/use-employees-list-url-state';
import { listEmployees } from '@/lib/api/employees';
import { toListEmployeesParams } from '@/lib/employees-list-params';
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
import { useEffect, useState } from 'react';

type TableColumnMeta = {
  className?: string;
  thClassName?: string;
  tdClassName?: string;
};

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): TableColumnMeta {
  return (header.column.columnDef.meta as TableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): TableColumnMeta {
  return (cell.column.columnDef.meta as TableColumnMeta | undefined) ?? {};
}

const columns = employeesColumns;

export function EmployeesTable() {
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    ensurePageInRange,
  } = useEmployeesListUrlState();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employees', 'list', pagination, columnFilters],
    queryFn: () => listEmployees(toListEmployeesParams(pagination, columnFilters)),
    placeholderData: keepPreviousData,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

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
    },
    manualPagination: true,
    manualFiltering: true,
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
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
    const message = error instanceof Error ? error.message : 'Không tải được danh sách nhân viên.';
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
            options: [
              { label: 'Hoạt động', value: 'active' },
              { label: 'Ngưng', value: 'inactive' },
            ],
          },
          {
            columnId: 'archive',
            title: 'Bản ghi',
            options: [{ label: 'Gồm đã xóa mềm', value: 'with_deleted' }],
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
                  {isLoading ? 'Đang tải…' : 'Không có nhân viên phù hợp.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className="mt-auto" />
      <EmployeesBulkActions table={table} />
    </div>
  );
}
