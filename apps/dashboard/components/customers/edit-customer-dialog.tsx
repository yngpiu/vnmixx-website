'use client';

import { deleteCustomer, getCustomer, restoreCustomer, updateCustomer } from '@/lib/api/customers';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

export type CustomerDialogMode = 'active' | 'delete' | 'restore';

type EditCustomerDialogProps = {
  customerId: number | null;
  mode: CustomerDialogMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

export function EditCustomerDialog({
  customerId,
  mode,
  open,
  onOpenChange,
}: EditCustomerDialogProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: open && customerId != null,
  });

  const detail = detailQuery.data;

  const updateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateCustomer(id, { isActive }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'detail'] });
      toast.success(variables.isActive ? 'Đã kích hoạt khách hàng.' : 'Đã vô hiệu hóa khách hàng.');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'detail'] });
      toast.success('Đã xóa khách hàng.');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'detail'] });
      toast.success('Đã khôi phục khách hàng.');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const isPending =
    updateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const isDeleted = Boolean(detail?.deletedAt);
  const activeFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const deleteFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const restoreFormDisabled = isPending || detailQuery.isLoading || !detail?.deletedAt;

  const submitToggleActive = () => {
    if (customerId == null || !detail || mode !== 'active') return;
    updateMutation.mutate({ id: customerId, isActive: !detail.isActive });
  };

  const submitDelete = () => {
    if (customerId == null || mode !== 'delete') return;
    deleteMutation.mutate(customerId);
  };

  const submitRestore = () => {
    if (customerId == null || mode !== 'restore' || !detail?.deletedAt) return;
    restoreMutation.mutate(customerId);
  };

  const title =
    mode === 'active'
      ? detail?.isActive
        ? 'Vô hiệu hóa khách hàng'
        : 'Kích hoạt khách hàng'
      : mode === 'delete'
        ? 'Xóa khách hàng'
        : mode === 'restore'
          ? 'Khôi phục khách hàng'
          : '';

  const description =
    mode === 'active' && detail
      ? detail.isActive
        ? 'Tài khoản khách hàng sẽ bị vô hiệu cho đến khi được kích hoạt lại.'
        : 'Kích hoạt lại tài khoản khách hàng này.'
      : mode === 'delete' && detail && !detail.deletedAt
        ? 'Khách hàng sẽ không còn trong danh sách thông thường. Bạn có thể khôi phục sau qua menu hành động (khi bật lọc bản ghi đã xóa).'
        : mode === 'restore' && detail?.deletedAt
          ? 'Khách hàng sẽ hiển thị lại trong danh sách và có thể chỉnh sửa như bình thường.'
          : mode === 'restore' && detail && !detail.deletedAt
            ? 'Bản ghi hiện không ở trạng thái đã xóa.'
            : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        {...(!description ? { 'aria-describedby': undefined as const } : {})}
        className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {detailQuery.isLoading && customerId != null ? (
          <p className="text-sm text-muted-foreground">Đang tải thông tin…</p>
        ) : null}

        {detailQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Không tải được khách hàng.'}
          </p>
        ) : null}

        {isDeleted && detail && mode !== 'restore' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              Khách hàng đã bị xóa — không thể thực hiện thao tác này. Dùng mục Khôi phục trên menu
              hành động.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && !isDeleted && mode === 'active' ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant={detail.isActive ? 'destructive' : 'default'}
                disabled={activeFormDisabled}
                onClick={submitToggleActive}
              >
                {isPending ? 'Đang xử lý…' : detail.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && !isDeleted && mode === 'delete' ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteFormDisabled}
                onClick={submitDelete}
              >
                {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && mode === 'restore' && isDeleted ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="button" disabled={restoreFormDisabled} onClick={submitRestore}>
                {restoreMutation.isPending ? 'Đang khôi phục…' : 'Khôi phục'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && mode === 'restore' && !isDeleted ? (
          <p className="text-sm text-muted-foreground" role="status">
            Khách hàng này chưa bị xóa.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
