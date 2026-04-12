'use client';

import { createProductColumns } from '@/app/products/products-columns';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { useProductsListUrlState } from '@/hooks/use-products-list-url-state';
import { listCategories } from '@/lib/api/categories';
import { listProducts } from '@/lib/api/products';
import { categoryDisplayName } from '@/lib/category-display-name';
import { toListProductsParams } from '@/lib/products-list-params';
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
  useReactTable,
  type OnChangeFn,
  type VisibilityState,
} from '@tanstack/react-table';
import { AlertCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

export function ProductsTable() {
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    globalFilter,
    onGlobalFilterChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useProductsListUrlState();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'list', { forProductFilter: true, isSoftDeleted: false }],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });

  const categoryFilterOptions = useMemo(() => {
    if (!categoriesData?.length) return [];
    return categoriesData.map((c) => ({
      label: categoryDisplayName(c.name),
      value: String(c.id),
    }));
  }, [categoriesData]);

  const listParams = useMemo(
    () => toListProductsParams(pagination, columnFilters, globalFilter, sorting),
    [pagination, columnFilters, globalFilter, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', 'list', listParams],
    queryFn: () => listProducts(listParams),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(() => createProductColumns(), []);

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);

  const onGlobalFilterChangeTable: OnChangeFn<string> = (updater) => {
    const next = typeof updater === 'function' ? updater(globalFilter) : updater;
    onGlobalFilterChange(next ?? '');
  };

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      columnFilters,
      columnVisibility,
      globalFilter,
      sorting,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: onGlobalFilterChangeTable,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách sản phẩm.';
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
        searchPlaceholder="Tìm theo tên sản phẩm…"
        globalFilterDebounceMs={350}
        filters={[
          {
            columnId: 'isActive',
            title: 'Hoạt động',
            selectionMode: 'single',
            options: [
              { label: 'Đang bật', value: 'active' },
              { label: 'Đang tắt', value: 'inactive' },
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
          ...(categoryFilterOptions.length
            ? [
                {
                  columnId: 'categoryId' as const,
                  title: 'Danh mục',
                  options: categoryFilterOptions,
                },
              ]
            : []),
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
                <TableRow key={row.id} className="group/row">
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
                  className="text-muted-foreground h-24 text-center"
                >
                  {isLoading ? 'Đang tải…' : 'Không có sản phẩm phù hợp.'}
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
