'use client';

import { createProductColumns } from '@/app/products/products-columns';
import { adminModuleEditPath } from '@/config/admin-modules';
import { listCategories } from '@/modules/categories/api/categories';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { InlineErrorAlert } from '@/modules/common/components/inline-error-alert';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import {
  deleteProduct,
  listProducts,
  restoreProduct,
  updateProduct,
} from '@/modules/products/api/products';
import { useProductsListTableState } from '@/modules/products/hooks/use-products-list-table-state';
import type { ProductAdminListItem } from '@/modules/products/types/product';
import { toListProductsParams } from '@/modules/products/utils/products-list-params';
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
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

export function ProductsTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useProductsListTableState();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [deleteTarget, setDeleteTarget] = useState<ProductAdminListItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ProductAdminListItem | null>(null);

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
    () => toListProductsParams(pagination, columnFilters, sorting),
    [pagination, columnFilters, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', 'list', listParams],
    queryFn: () => listProducts(listParams),
    placeholderData: keepPreviousData,
  });

  const invalidateProductsList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
  };

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; isActive: boolean }) =>
      updateProduct(vars.id, { isActive: vars.isActive }),
    onSuccess: async (_data, variables) => {
      toast.success(variables.isActive ? 'Đã hiển thị sản phẩm.' : 'Đã ẩn sản phẩm.');
      await invalidateProductsList();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success('Đã xóa mềm sản phẩm.');
      await invalidateProductsList();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreProduct(id),
    onSuccess: async () => {
      toast.success('Đã khôi phục sản phẩm.');
      await invalidateProductsList();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const columns = useMemo(
    () =>
      createProductColumns({
        onDetail: (product) => {
          router.push(`/products/${product.id}`);
        },
        onEdit: (product) => {
          router.push(adminModuleEditPath('products', product.id));
        },
        onToggleActive: (product) => {
          setToggleTarget(product);
        },
        onDelete: (product) => {
          setDeleteTarget(product);
        },
        onRestore: (product) => {
          restoreMutation.mutate(product.id);
        },
      }),
    [restoreMutation, router],
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
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách sản phẩm.';
    return <InlineErrorAlert message={message} />;
  }

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
          searchHelpTooltip="Tìm theo tên sản phẩm."
          searchKey="name"
          searchDebounceMs={350}
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

      <AlertDialog
        open={toggleTarget != null}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? 'Ẩn sản phẩm?' : 'Hiện sản phẩm?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget
                ? toggleTarget.isActive
                  ? `Sản phẩm "${toggleTarget.name}" sẽ bị ẩn khỏi cửa hàng.`
                  : `Sản phẩm "${toggleTarget.name}" sẽ hiển thị lại trên cửa hàng.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button" disabled={updateMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={updateMutation.isPending || !toggleTarget}
              onClick={() => {
                if (!toggleTarget) return;
                updateMutation.mutate(
                  { id: toggleTarget.id, isActive: !toggleTarget.isActive },
                  {
                    onSuccess: () => {
                      setToggleTarget(null);
                    },
                  },
                );
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mềm sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Sản phẩm "${deleteTarget.name}" sẽ được xóa mềm và có thể khôi phục sau.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button" disabled={deleteMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Xóa mềm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
