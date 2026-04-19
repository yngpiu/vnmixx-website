'use client';

import { createCategoryColumns } from '@/app/categories/categories-columns';
import { CategoriesTableActionsProvider } from '@/app/categories/categories-table-actions-context';
import {
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
  type UpdateCategoryBody,
} from '@/modules/categories/api/categories';
import { CategoryDetailDialog } from '@/modules/categories/components/categories/category-detail-dialog';
import { CategoryToggleActiveDialog } from '@/modules/categories/components/categories/category-toggle-active-dialog';
import type {
  CategoryAdmin,
  CategoryAdminTreeNode,
  CategoryTableRow,
} from '@/modules/categories/types/category';
import { toListCategoriesParams } from '@/modules/categories/utils/categories-list-params';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import {
  buildCategoryAdminTree,
  flattenVisibleCategoryRows,
} from '@/modules/categories/utils/category-tree';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { InlineErrorAlert } from '@/modules/common/components/inline-error-alert';
import { CATEGORY_TABLE_SORT_IDS } from '@/modules/common/utils/data-table-sort-allowlists';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { isAxiosError } from 'axios';
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

function rowTextMatches(r: CategoryTableRow, q: string): boolean {
  const title = categoryDisplayName(r.node.name).toLowerCase();
  const full = r.node.name.toLowerCase();
  const slug = r.node.slug.toLowerCase();
  return title.includes(q) || full.includes(q) || slug.includes(q);
}

/** Giữ mọi dòng là tổ tiên (đường đi từ gốc) của ít nhất một dòng khớp tìm kiếm. */
function keepIdsWithAncestors(rows: CategoryTableRow[], q: string): Set<number> {
  const byId = new Map<number, CategoryTableRow>();
  for (const r of rows) {
    byId.set(r.node.id, r);
  }
  const matched = new Set<number>();
  for (const r of rows) {
    if (rowTextMatches(r, q)) matched.add(r.node.id);
  }
  const keep = new Set<number>();
  for (const start of matched) {
    let cur: number | null = start;
    while (cur != null) {
      keep.add(cur);
      const row = byId.get(cur);
      cur = row ? (row.node.parentId ?? row.node.parent?.id ?? null) : null;
    }
  }
  return keep;
}

/** Lọc client theo ô tìm (cột khác lọc qua API). */
function filterCategoryRows(rows: CategoryTableRow[], globalFilter: string): CategoryTableRow[] {
  const q = globalFilter.trim().toLowerCase();
  if (!q) return rows;
  const keep = keepIdsWithAncestors(rows, q);
  return rows.filter((r) => keep.has(r.node.id));
}

const categorySortIds = CATEGORY_TABLE_SORT_IDS as readonly string[];

function rootNodeForId(rows: CategoryTableRow[], rootId: number): CategoryAdmin | undefined {
  return rows.find((r) => r.node.id === rootId)?.node;
}

function compareCategoryRoots(
  rootIdA: number,
  rootIdB: number,
  rows: CategoryTableRow[],
  sortId: string,
  desc: boolean,
): number {
  const a = rootNodeForId(rows, rootIdA);
  const b = rootNodeForId(rows, rootIdB);
  if (!a || !b) return 0;
  const dir = desc ? -1 : 1;
  switch (sortId) {
    case 'name':
      return (
        dir *
        categoryDisplayName(a.name).localeCompare(categoryDisplayName(b.name), 'vi', {
          sensitivity: 'base',
        })
      );
    case 'slug':
      return dir * a.slug.localeCompare(b.slug, 'vi');
    case 'isActive':
      return dir * (Number(a.isActive) - Number(b.isActive));
    case 'updatedAt':
      return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    default:
      return 0;
  }
}

function orderedRootIds(rows: CategoryTableRow[], sorting: SortingState): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const r of rows) {
    if (!seen.has(r.rootId)) {
      seen.add(r.rootId);
      ids.push(r.rootId);
    }
  }
  const s = sorting[0];
  if (!s || !categorySortIds.includes(s.id)) {
    return ids;
  }
  return [...ids].sort((aa, bb) => compareCategoryRoots(aa, bb, rows, s.id, s.desc));
}

type CategoriesTableProps = {
  onOpenCreateChild?: (parent: CategoryAdminTreeNode) => void;
};

export function CategoriesTable({ onOpenCreateChild }: CategoriesTableProps = {}) {
  const queryClient = useQueryClient();
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set());
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [detailCategory, setDetailCategory] = useState<CategoryAdminTreeNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryAdminTreeNode | null>(null);
  const [toggleActiveTarget, setToggleActiveTarget] = useState<CategoryAdminTreeNode | null>(null);

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const listParams = useMemo(() => toListCategoriesParams(columnFilters), [columnFilters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['categories', 'list', listParams],
    queryFn: () => listCategories(listParams),
  });

  const invalidateCategories = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; body: UpdateCategoryBody }) =>
      updateCategory(vars.id, vars.body),
    onSuccess: async (_data, variables) => {
      const body = variables.body;
      const keys = Object.keys(body);
      if (keys.length === 1 && 'isActive' in body && body.isActive !== undefined) {
        toast.success(body.isActive ? 'Đã kích hoạt danh mục.' : 'Đã vô hiệu hóa danh mục.');
      } else {
        toast.success('Đã cập nhật danh mục.');
      }
      await invalidateCategories();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: async () => {
      toast.success('Đã xóa danh mục.');
      setDeleteTarget(null);
      await invalidateCategories();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreCategory(id),
    onSuccess: async () => {
      toast.success('Đã khôi phục danh mục.');
      await invalidateCategories();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const openCategoryDetail = useCallback((node: CategoryAdminTreeNode) => {
    setDetailCategory(node);
  }, []);

  const openToggleActive = useCallback((node: CategoryAdminTreeNode) => {
    setToggleActiveTarget(node);
  }, []);

  const confirmToggleActive = useCallback(() => {
    if (!toggleActiveTarget) return;
    const { id, isActive } = toggleActiveTarget;
    updateMutation.mutate(
      { id, body: { isActive: !isActive } },
      {
        onSuccess: () => {
          setToggleActiveTarget(null);
        },
      },
    );
  }, [toggleActiveTarget, updateMutation]);

  const openToggleFeatured = useCallback(
    (node: CategoryAdminTreeNode) => {
      updateMutation.mutate({ id: node.id, body: { isFeatured: !node.isFeatured } });
    },
    [updateMutation],
  );

  const openDeleteCategory = useCallback((node: CategoryAdminTreeNode) => {
    setDeleteTarget(node);
  }, []);

  const openRestoreCategory = useCallback(
    (node: CategoryAdminTreeNode) => {
      restoreMutation.mutate(node.id);
    },
    [restoreMutation],
  );

  const tree = useMemo(() => buildCategoryAdminTree(data ?? []), [data]);

  /** Khi đang tìm: làm phẳng cả cây (bỏ thu gọn) để luôn có đủ cha cho nhánh khớp. */
  const tableRows = useMemo(() => {
    const hasSearch = Boolean(globalFilter.trim());
    const collapsed = hasSearch ? new Set<number>() : collapsedIds;
    return flattenVisibleCategoryRows(tree, collapsed);
  }, [tree, collapsedIds, globalFilter]);

  const filteredRows = useMemo(
    () => filterCategoryRows(tableRows, globalFilter),
    [tableRows, globalFilter],
  );

  const rootIdsForPage = useMemo(
    () => orderedRootIds(filteredRows, sorting),
    [filteredRows, sorting],
  );

  const pageCount = Math.max(1, Math.ceil(rootIdsForPage.length / pagination.pageSize));

  const pagedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const slice = rootIdsForPage.slice(start, start + pagination.pageSize);
    const onPage = new Set(slice);
    return filteredRows.filter((r) => onPage.has(r.rootId));
  }, [filteredRows, rootIdsForPage, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo(() => {
    const collapseForUi = globalFilter.trim() ? new Set<number>() : collapsedIds;
    return createCategoryColumns({
      collapsedIds: collapseForUi,
      onToggleCollapse: toggleCollapse,
    });
  }, [collapsedIds, toggleCollapse, globalFilter]);

  const table = useReactTable({
    data: pagedRows,
    columns,
    state: {
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.node.id),
  });

  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters, sorting]);

  useEffect(() => {
    setPagination((p) => {
      const pages = Math.max(1, Math.ceil(rootIdsForPage.length / p.pageSize));
      const maxIdx = pages - 1;
      if (p.pageIndex > maxIdx) return { ...p, pageIndex: maxIdx };
      return p;
    });
  }, [rootIdsForPage.length, pagination.pageSize]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách danh mục.';
    return <InlineErrorAlert message={message} />;
  }

  return (
    <>
      <CategoriesTableActionsProvider
        openCategoryDetail={openCategoryDetail}
        openToggleActive={openToggleActive}
        openToggleFeatured={openToggleFeatured}
        openDeleteCategory={openDeleteCategory}
        openRestoreCategory={openRestoreCategory}
        openCreateChild={onOpenCreateChild}
      >
        <div
          className={cn(
            'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
            isLoading && 'opacity-70',
          )}
        >
          <DataTableToolbar
            table={table}
            searchHelpTooltip="Tìm theo tên hiển thị, tên đầy đủ hoặc slug."
            globalFilterDebounceMs={350}
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
                      {isLoading ? 'Đang tải…' : 'Không có danh mục phù hợp bộ lọc.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} className="mt-auto" />

          <p className="text-muted-foreground text-xs">
            Cây theo cha–con; mũi tên cạnh tên để thu gọn nhánh (khi không gõ tìm kiếm). Khi tìm,
            cây mở hết và luôn hiện đủ đường đi từ gốc tới mục khớp. Bộ lọc trạng thái xóa điều
            khiển dữ liệu tải từ API (mặc định chỉ danh mục chưa xóa; chọn cả hai mục trong bộ lọc
            để gồm cả đã xóa). Ô chọn số dòng mỗi trang tính theo{' '}
            <span className="font-medium text-foreground">danh mục gốc (cấp 1)</span> — con cháu
            cùng nhánh vẫn hiển thị kèm, không tính vào giới hạn đó.
          </p>
        </div>
      </CategoriesTableActionsProvider>

      <CategoryDetailDialog
        category={detailCategory}
        open={detailCategory != null}
        onOpenChange={(open) => {
          if (!open) setDetailCategory(null);
        }}
      />

      <CategoryToggleActiveDialog
        category={toggleActiveTarget}
        open={toggleActiveTarget != null}
        onOpenChange={(open) => {
          if (!open) setToggleActiveTarget(null);
        }}
        isPending={updateMutation.isPending}
        onConfirm={confirmToggleActive}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Danh mục "${categoryDisplayName(deleteTarget.name)}" sẽ ẩn khỏi shop. Có thể khôi phục sau nếu không còn ràng buộc.`
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
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
