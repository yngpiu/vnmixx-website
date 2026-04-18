'use client';

import { DataTablePagination, DataTableToolbar } from '@/components/data-table';
import { ListPage } from '@/components/list-page';
import {
  deleteAdminReview,
  getAdminReviewDetail,
  getAdminReviews,
  updateAdminReviewStatus,
  type AdminReviewListParams,
} from '@/lib/api/analytics';
import type { AdminReviewListItem } from '@/lib/types/analytics';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import { isAxiosError } from 'axios';
import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  ScanEyeIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (Array.isArray(responseData?.message)) return responseData.message.join(', ');
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ratingStars(rating: number): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((item) => (
        <StarIcon
          key={item}
          className={`size-3.5 ${item <= rating ? 'fill-current' : ''}`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function ReviewsManagementView(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [detailReviewId, setDetailReviewId] = useState<number | null>(null);
  const queryParams = useMemo<AdminReviewListParams>(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      keyword: globalFilter.trim() || undefined,
      visibility:
        (columnFilters.find((item) => item.id === 'visibility')?.value as
          | 'all'
          | 'visible'
          | 'hidden'
          | undefined) ?? 'all',
    }),
    [columnFilters, globalFilter, pagination.pageIndex, pagination.pageSize],
  );
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews', queryParams],
    queryFn: () => getAdminReviews(queryParams),
  });
  const detailQuery = useQuery({
    queryKey: ['admin', 'reviews', 'detail', detailReviewId],
    queryFn: () => getAdminReviewDetail(detailReviewId as number),
    enabled: detailReviewId !== null,
  });
  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  };
  const visibilityMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: number; status: 'VISIBLE' | 'HIDDEN' }) =>
      updateAdminReviewStatus(reviewId, status),
    onSuccess: async (_, variables) => {
      toast.success(variables.status === 'VISIBLE' ? 'Đã hiện đánh giá.' : 'Đã ẩn đánh giá.');
      await refreshList();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (reviewId: number) => deleteAdminReview(reviewId),
    onSuccess: async () => {
      toast.success('Đã xóa đánh giá.');
      await refreshList();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });
  const isMutating = visibilityMutation.isPending || deleteMutation.isPending;
  const rows = reviewsQuery.data?.items ?? [];
  const renderActionMenu = useCallback(
    (review: AdminReviewListItem): React.JSX.Element => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Mở thao tác đánh giá"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setDetailReviewId(review.id)}>
              <ScanEyeIcon className="mr-2 size-4" />
              Chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMutating}
              onSelect={() =>
                visibilityMutation.mutate({
                  reviewId: review.id,
                  status: review.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE',
                })
              }
            >
              {review.status === 'VISIBLE' ? (
                <>
                  <EyeOffIcon className="mr-2 size-4" />
                  Ẩn
                </>
              ) : (
                <>
                  <EyeIcon className="mr-2 size-4" />
                  Hiện
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isMutating}
              onSelect={() => {
                if (window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) {
                  deleteMutation.mutate(review.id);
                }
              }}
            >
              <Trash2Icon className="mr-2 size-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    [deleteMutation, isMutating, visibilityMutation],
  );
  const columns = useMemo<ColumnDef<AdminReviewListItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span>,
      },
      {
        accessorKey: 'rating',
        header: 'Đánh giá',
        cell: ({ row }) => (
          <div className="space-y-1">
            {ratingStars(row.original.rating)}
            <p className="max-w-[260px] truncate text-sm font-medium">
              {row.original.title ?? 'Không có tiêu đề'}
            </p>
            <p className="max-w-[260px] truncate text-xs text-muted-foreground">
              {row.original.content ?? 'Không có nội dung'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Sản phẩm',
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate">{row.original.productName}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Khách hàng',
        cell: ({ row }) => row.original.customerName ?? 'Khách ẩn danh',
      },
      {
        accessorKey: 'status',
        id: 'visibility',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status === 'VISIBLE' ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Đang hiện
            </span>
          ) : (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
              Đang ẩn
            </span>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => renderActionMenu(row.original),
      },
    ],
    [renderActionMenu],
  );
  const table = useReactTable({
    data: rows,
    columns,
    pageCount: Math.max(reviewsQuery.data?.totalPages ?? 1, 1),
    state: {
      pagination,
      columnFilters,
      globalFilter,
    },
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: (next) => {
      const value = typeof next === 'function' ? next(columnFilters) : next;
      setColumnFilters(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onGlobalFilterChange: (value) => {
      setGlobalFilter(String(value));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
  return (
    <ListPage title="Danh sách đánh giá">
      <div className="flex flex-col gap-4">
        <DataTableToolbar
          table={table}
          searchPlaceholder="Tìm theo tiêu đề, nội dung, sản phẩm, khách hàng..."
          globalFilterDebounceMs={350}
          filters={[
            {
              columnId: 'visibility',
              title: 'Trạng thái hiển thị',
              selectionMode: 'single',
              options: [
                { label: 'Tất cả', value: 'all' },
                { label: 'Đang hiện', value: 'visible' },
                { label: 'Đang ẩn', value: 'hidden' },
              ],
            },
          ]}
        />
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Đánh giá</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="size-4 animate-spin" />
                      Đang tải đánh giá...
                    </span>
                  </TableCell>
                </TableRow>
              ) : reviewsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {apiErrorMessage(reviewsQuery.error)}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Không có đánh giá phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="mt-auto" />
      </div>
      <Dialog
        open={detailReviewId !== null}
        onOpenChange={(open) => !open && setDetailReviewId(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đánh giá</DialogTitle>
            <DialogDescription>Thông tin đầy đủ của đánh giá khách hàng.</DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : detailQuery.isError ? (
            <p className="text-sm text-destructive">{apiErrorMessage(detailQuery.error)}</p>
          ) : detailQuery.data ? (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Mã đánh giá:</strong> #{detailQuery.data.id}
              </p>
              <p>
                <strong>Sản phẩm:</strong> {detailQuery.data.productName} (#
                {detailQuery.data.productId})
              </p>
              <p>
                <strong>Khách hàng:</strong> {detailQuery.data.customerName ?? 'Khách ẩn danh'}
                {detailQuery.data.customerEmail ? ` - ${detailQuery.data.customerEmail}` : ''}
              </p>
              <p>
                <strong>Điểm:</strong> {detailQuery.data.rating}/5
              </p>
              <p>
                <strong>Tiêu đề:</strong> {detailQuery.data.title ?? 'Không có'}
              </p>
              <p>
                <strong>Nội dung:</strong> {detailQuery.data.content ?? 'Không có'}
              </p>
              <p>
                <strong>Trạng thái:</strong>{' '}
                {detailQuery.data.status === 'VISIBLE' ? 'Đang hiện' : 'Đang ẩn'}
              </p>
              <p>
                <strong>Tạo lúc:</strong> {formatDate(detailQuery.data.createdAt)}
              </p>
              <p>
                <strong>Cập nhật:</strong> {formatDate(detailQuery.data.updatedAt)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailReviewId(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}
