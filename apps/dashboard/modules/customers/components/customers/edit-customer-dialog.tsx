'use client';

import {
  deleteCustomer,
  getCustomer,
  restoreCustomer,
  updateCustomer,
} from '@/modules/customers/api/customers';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  const canToggleStatus = detail?.status === 'ACTIVE' || detail?.status === 'INACTIVE';

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateCustomer(id, { status }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'detail'] });
      toast.success(
        variables.status === 'ACTIVE' ? 'Đã kích hoạt khách hàng.' : 'Đã vô hiệu hóa khách hàng.',
      );
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
  const activeFormDisabled = isPending || isDeleted || detailQuery.isLoading || !canToggleStatus;
  const deleteFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const restoreFormDisabled = isPending || detailQuery.isLoading || !detail?.deletedAt;

  const submitToggleActive = () => {
    if (customerId == null || !detail || mode !== 'active') return;
    const nextStatus: 'ACTIVE' | 'INACTIVE' = detail.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateMutation.mutate({ id: customerId, status: nextStatus });
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
      ? detail?.status === 'ACTIVE'
        ? 'Vô hiệu hóa khách hàng'
        : detail?.status === 'INACTIVE'
          ? 'Kích hoạt khách hàng'
          : 'Quản lý trạng thái khách hàng'
      : mode === 'delete'
        ? 'Xóa khách hàng'
        : mode === 'restore'
          ? 'Khôi phục khách hàng'
          : '';

  const loading = Boolean(detailQuery.isLoading && customerId != null);
  const error = detailQuery.isError;
  const deletedBlock = Boolean(isDeleted && detail && mode !== 'restore');
  const activeBlock = Boolean(detail && !detailQuery.isLoading && !isDeleted && mode === 'active');
  const deleteBlock = Boolean(detail && !detailQuery.isLoading && !isDeleted && mode === 'delete');
  const restoreDeletedBlock = Boolean(
    detail && !detailQuery.isLoading && mode === 'restore' && isDeleted,
  );
  const restoreNotDeletedBlock = Boolean(
    detail && !detailQuery.isLoading && mode === 'restore' && !isDeleted,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {loading ? <p className="text-sm text-muted-foreground">Đang tải thông tin…</p> : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Không tải được khách hàng.'}
            </p>
          ) : null}

          {deletedBlock ? (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              Khách hàng đã bị xóa — không thể thực hiện thao tác này. Dùng mục Khôi phục trên menu
              hành động.
            </p>
          ) : null}

          {activeBlock && detail ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>
                  {detail.email}
                  {detail.status === 'PENDING_VERIFICATION'
                    ? ' • Tài khoản đang chờ xác minh email'
                    : ''}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {activeBlock && detail?.status === 'PENDING_VERIFICATION' ? (
            <p className="text-sm text-muted-foreground" role="status">
              Khách hàng đang ở trạng thái chờ xác minh email, nên không thể đổi trực tiếp giữa kích
              hoạt và vô hiệu hóa từ hộp thoại này.
            </p>
          ) : null}

          {deleteBlock && detail ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {restoreDeletedBlock && detail ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {restoreNotDeletedBlock ? (
            <p className="text-sm text-muted-foreground" role="status">
              Khách hàng này chưa bị xóa.
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          {loading || error || deletedBlock || restoreNotDeletedBlock ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {error || deletedBlock || restoreNotDeletedBlock ? 'Đóng' : 'Hủy'}
            </Button>
          ) : null}

          {activeBlock && detail ? (
            <>
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
                variant={detail.status === 'ACTIVE' ? 'destructive' : 'default'}
                disabled={activeFormDisabled}
                onClick={submitToggleActive}
              >
                {isPending
                  ? 'Đang xử lý…'
                  : detail.status === 'ACTIVE'
                    ? 'Vô hiệu hóa'
                    : detail.status === 'INACTIVE'
                      ? 'Kích hoạt'
                      : 'Không khả dụng'}
              </Button>
            </>
          ) : null}

          {deleteBlock ? (
            <>
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
            </>
          ) : null}

          {restoreDeletedBlock ? (
            <>
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
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
