'use client';

import { createInventoryColumns } from '@/app/inventory/inventory-columns';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { InlineErrorAlert } from '@/modules/common/components/inline-error-alert';
import { listInventory } from '@/modules/inventory/api/inventory';
import { useInventoryListTableState } from '@/modules/inventory/hooks/use-inventory-list-table-state';
import type { InventoryListItem } from '@/modules/inventory/types/inventory';
import { toListInventoryParams } from '@/modules/inventory/utils/inventory-list-params';
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
  type VisibilityState,
} from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

type InventoryTableProps = {
  onImportStock: (item: InventoryListItem) => void;
  onExportStock: (item: InventoryListItem) => void;
};

export function InventoryTable({ onImportStock, onExportStock }: InventoryTableProps) {
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useInventoryListTableState();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const listParams = useMemo(
    () => toListInventoryParams(pagination, columnFilters, sorting),
    [pagination, columnFilters, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventory', 'list', listParams],
    queryFn: () => listInventory(listParams),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(
    () =>
      createInventoryColumns({
        onImportStock,
        onExportStock,
      }),
    [onImportStock, onExportStock],
  );

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta?.totalPages ?? 1, 1);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      columnFilters,
      columnVisibility,
      sorting,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.variantId),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách kho hàng.';
    return <InlineErrorAlert message={message} />;
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
        searchHelpTooltip="Tìm theo tên sản phẩm hoặc SKU."
        searchKey="productName"
        searchDebounceMs={350}
        filters={[
          {
            columnId: 'status',
            title: 'Trạng thái',
            selectionMode: 'single',
            options: [
              { label: 'Còn hàng', value: 'in_stock' },
              { label: 'Sắp hết', value: 'low_stock' },
              { label: 'Hết hàng', value: 'out_of_stock' },
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
                  className="h-24 text-center text-muted-foreground"
                >
                  {isLoading ? 'Đang tải…' : 'Không có SKU phù hợp.'}
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
