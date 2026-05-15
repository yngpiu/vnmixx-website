'use client';

import { createSizesColumns } from '@/app/sizes/sizes-columns';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { InlineErrorAlert } from '@/modules/common/components/inline-error-alert';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { deleteSize, listSizes, updateSize } from '@/modules/sizes/api/sizes';
import { EditSizeDialog } from '@/modules/sizes/components/sizes/edit-size-dialog';
import { useSizesListTableState } from '@/modules/sizes/hooks/use-sizes-list-table-state';
import type { SizeAdmin } from '@/modules/sizes/types/size';
import { toListSizesParams } from '@/modules/sizes/utils/sizes-list-params';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { flexRender, getCoreRowModel, useReactTable, type Row } from '@tanstack/react-table';
import { GripVerticalIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

type SortableSizeRowProps = {
  row: Row<SizeAdmin>;
  isReordering: boolean;
};

function SortableSizeRow({ row, isReordering }: SortableSizeRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/row touch-none',
        isDragging && 'z-10 opacity-90 shadow-lg ring-2 ring-primary/30',
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const cm = cellMeta(cell);

        if (cell.column.id === 'drag') {
          return (
            <TableCell
              key={cell.id}
              className={cn(
                'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                cm.className,
                cm.tdClassName,
              )}
            >
              <button
                type="button"
                ref={setActivatorNodeRef}
                className="text-muted-foreground hover:bg-muted flex size-9 cursor-grab items-center justify-center rounded-md border border-transparent active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
                aria-label="Kéo để đổi thứ tự"
                disabled={!isReordering}
                {...attributes}
                {...listeners}
              >
                <GripVerticalIcon className="size-4" />
              </button>
            </TableCell>
          );
        }

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
  );
}

export function SizesTable() {
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useSizesListTableState();

  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SizeAdmin | null>(null);

  const openEdit = useCallback((s: SizeAdmin) => setEditId(s.id), []);
  const openDelete = useCallback((s: SizeAdmin) => setDeleteTarget(s), []);

  const columns = useMemo(
    () =>
      createSizesColumns({
        onEdit: openEdit,
        onDelete: openDelete,
      }),
    [openEdit, openDelete],
  );

  const listParams = useMemo(
    () => toListSizesParams(pagination, columnFilters, sorting),
    [pagination, columnFilters, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sizes', 'admin', listParams],
    queryFn: () => listSizes(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta?.totalPages ?? 1, 1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: async (orderedRows: SizeAdmin[]) => {
      await Promise.all(
        orderedRows.map((row, index) =>
          updateSize(row.id, {
            sortOrder: orderedRows[index]?.sortOrder ?? row.sortOrder,
          }),
        ),
      );
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật thứ tự kích cỡ.');
      await queryClient.invalidateQueries({ queryKey: ['sizes'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSize(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sizes'] });
      toast.success('Đã xóa kích cỡ.');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      columnFilters,
      sorting,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange,
    onColumnFiltersChange,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount, listParams]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách kích cỡ.';
    return <InlineErrorAlert message={message} />;
  }

  const searchFilter = columnFilters.find((f) => f.id === 'label');
  const searchText = typeof searchFilter?.value === 'string' ? searchFilter.value.trim() : '';
  const emptyMessage = searchText ? 'Không có kích cỡ khớp bộ lọc.' : 'Chưa có kích cỡ nào.';
  const rowIds = table.getRowModel().rows.map((row) => row.id);
  const isReordering = rowIds.length > 1 && !reorderMutation.isPending;

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentRows = table.getRowModel().rows;
    const oldIndex = currentRows.findIndex((row) => row.id === active.id);
    const newIndex = currentRows.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const orderedRows = arrayMove(currentRows, oldIndex, newIndex).map((row, index) => ({
      ...row.original,
      sortOrder: currentRows[index]?.original.sortOrder ?? row.original.sortOrder,
    }));

    reorderMutation.mutate(orderedRows);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        autoScroll={false}
        onDragEnd={handleDragEnd}
      >
        <div
          className={cn(
            'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
            isLoading && 'opacity-70',
          )}
        >
          <DataTableToolbar
            table={table}
            searchHelpTooltip="Tìm theo nhãn kích cỡ."
            searchKey="label"
            searchDebounceMs={350}
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
                  <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <SortableSizeRow key={row.id} row={row} isReordering={isReordering} />
                    ))}
                  </SortableContext>
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
      </DndContext>

      <EditSizeDialog
        sizeId={editId}
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kích cỡ?</AlertDialogTitle>
            <AlertDialogDescription>
              Kích cỡ <strong className="text-foreground">{deleteTarget?.label}</strong> sẽ bị xóa
              nếu không còn được sản phẩm sử dụng.
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
