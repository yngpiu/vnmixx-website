'use client';

import { createColorsColumns } from '@/app/colors/colors-columns';
import { EditColorDialog } from '@/components/colors/edit-color-dialog';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { useColorsListUrlState } from '@/hooks/use-colors-list-url-state';
import { deleteColor, listColors } from '@/lib/api/colors';
import { toListColorsParams } from '@/lib/colors-list-params';
import type { ColorAdmin } from '@/lib/types/color';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, useReactTable, type OnChangeFn } from '@tanstack/react-table';
import { isAxiosError } from 'axios';
import { AlertCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: unknown };
    const m = body?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi.';
}

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

export function ColorsTable() {
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    globalFilter,
    onGlobalFilterChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useColorsListUrlState();

  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColorAdmin | null>(null);

  const openEdit = useCallback((c: ColorAdmin) => setEditId(c.id), []);
  const openDelete = useCallback((c: ColorAdmin) => setDeleteTarget(c), []);

  const columns = useMemo(
    () =>
      createColorsColumns({
        onEdit: openEdit,
        onDelete: openDelete,
      }),
    [openEdit, openDelete],
  );

  const listParams = useMemo(
    () => toListColorsParams(pagination, globalFilter, sorting),
    [pagination, globalFilter, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['colors', 'admin', listParams],
    queryFn: () => listColors(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteColor(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['colors'] });
      toast.success('Đã xóa màu.');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

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
      globalFilter,
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange,
    onGlobalFilterChange: onGlobalFilterChangeTable,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount, listParams]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách màu.';
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

  const emptyMessage = globalFilter.trim() ? 'Không có màu khớp bộ lọc.' : 'Chưa có màu nào.';

  return (
    <>
      <div
        className={cn(
          'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
          isLoading && 'opacity-70',
        )}
      >
        <DataTableToolbar
          table={table}
          searchPlaceholder="Tìm theo tên hoặc mã HEX…"
          globalFilterDebounceMs={350}
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
                    {isLoading ? 'Đang tải…' : emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="mt-auto" />
      </div>

      <EditColorDialog
        colorId={editId}
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa màu?</AlertDialogTitle>
            <AlertDialogDescription>
              Màu <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xóa nếu
              không còn được sản phẩm sử dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
