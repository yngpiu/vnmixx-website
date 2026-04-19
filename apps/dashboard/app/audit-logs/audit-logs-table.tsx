'use client';

import { AuditLogDetailDialog } from '@/app/audit-logs/audit-log-detail-dialog';
import { createAuditLogsColumns } from '@/app/audit-logs/audit-logs-columns';
import { AuditLogActionTreeFilter } from '@/components/audit-logs/audit-log-action-tree-filter';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { EmployeeInfiniteColumnFilter } from '@/components/employees/employee-infinite-column-filter';
import { InlineErrorAlert } from '@/components/inline-error-alert';
import { adminModuleDetailPath } from '@/lib/admin-modules';
import { listAuditLogs } from '@/lib/api/audit-logs';
import type { AuditLogItem } from '@/types/audit-log';
import { Button } from '@repo/ui/components/ui/button';
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
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

/**
 * Bảng nhật ký thao tác: bộ lọc và phân trang chỉ trong state (URL trình duyệt không đổi).
 * `listAuditLogs` dựng query string gọi API; không phải URL route dashboard.
 */
export function AuditLogsTable() {
  const router = useRouter();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const openActorEmployeeDetail = useCallback(
    (employeeId: number) => {
      router.push(adminModuleDetailPath('employees', employeeId));
    },
    [router],
  );

  const listParams = useMemo(() => {
    const statusFilterValues =
      ((columnFilters.find((f) => f.id === 'status')?.value ?? []) as string[]) ?? [];
    const actorFilterValues =
      ((columnFilters.find((f) => f.id === 'actorEmployee')?.value ?? []) as string[]) ?? [];
    const actionFilterValues =
      ((columnFilters.find((f) => f.id === 'action')?.value ?? []) as string[]) ?? [];
    const actorEmployeeIds = actorFilterValues
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n >= 1);
    const actions = actionFilterValues.length > 0 ? [...actionFilterValues] : undefined;
    const search =
      actions === undefined && globalFilter.trim().length > 0 ? globalFilter.trim() : undefined;
    return {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      actions,
      search,
      status:
        statusFilterValues.length === 1
          ? (statusFilterValues[0] as 'SUCCESS' | 'FAILED')
          : undefined,
      actorEmployeeIds: actorEmployeeIds.length > 0 ? actorEmployeeIds : undefined,
    };
  }, [pagination, globalFilter, columnFilters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-logs', 'list', listParams],
    queryFn: () => listAuditLogs(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);

  const columns = useMemo<ColumnDef<AuditLogItem>[]>(
    () => [
      ...createAuditLogsColumns({ onOpenActorEmployeeDetail: openActorEmployeeDetail }),
      {
        id: 'detail',
        header: () => <span className="sr-only">Chi tiết</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Xem chi tiết nhật ký thao tác #${row.original.id}`}
            onClick={() => {
              setDetailItem(row.original);
              setDetailOpen(true);
            }}
          >
            <EyeIcon className="size-4" />
          </Button>
        ),
        meta: {
          dataTableColumnLabel: 'Chi tiết',
          thClassName: 'w-12 text-center',
          tdClassName: 'w-12 text-center',
        } satisfies DataTableColumnMeta,
        enableSorting: false,
      },
    ],
    [openActorEmployeeDetail],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onGlobalFilterChange: (updater) => {
      const nextValue = typeof updater === 'function' ? updater(globalFilter) : updater;
      setGlobalFilter(nextValue ?? '');
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onColumnFiltersChange: (updater) => {
      const nextFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(nextFilters);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => String(row.id),
  });

  const actorColumn = table.getColumn('actorEmployee');
  const actionColumn = table.getColumn('action');

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được nhật ký thao tác.';
    return <InlineErrorAlert message={message} />;
  }

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
        isLoading && 'opacity-70',
      )}
    >
      <AuditLogDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
      />
      <DataTableToolbar
        table={table}
        searchHelpTooltip="Tìm theo họ tên hoặc email nhân viên thực hiện, hoặc theo tên hành động hiển thị bằng tiếng Việt."
        globalFilterDebounceMs={350}
        filterExtras={
          <>
            <AuditLogActionTreeFilter column={actionColumn} title="Hành động" />
            <EmployeeInfiniteColumnFilter column={actorColumn} title="Nhân viên" />
          </>
        }
        filters={[
          {
            columnId: 'status',
            title: 'Trạng thái',
            selectionMode: 'single',
            options: [
              { label: 'Thành công', value: 'SUCCESS' },
              { label: 'Thất bại', value: 'FAILED' },
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
                  {isLoading ? 'Đang tải…' : 'Không có dữ liệu nhật ký thao tác.'}
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
