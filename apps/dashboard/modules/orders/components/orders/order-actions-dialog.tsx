'use client';

import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { formatVnd } from '@/modules/common/utils/format-vnd';
import { getAdminOrder, updateAdminOrderStatus } from '@/modules/orders/api/orders';
import type { OrderStatus, PaymentMethod } from '@/modules/orders/types/order-admin';
import {
  ORDER_STATUS_FILTER_OPTIONS,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from '@/modules/orders/utils/order-status-labels';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const ALLOWED_NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_CONFIRMATION: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['AWAITING_SHIPMENT', 'CANCELLED'],
  AWAITING_SHIPMENT: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function OrderActionsDialog(props: {
  orderCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onAfterMutation?: () => void;
}) {
  const { orderCode, open, onOpenChange, title, onAfterMutation } = props;
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['orders', 'admin', 'detail', orderCode],
    queryFn: () => getAdminOrder(orderCode),
    enabled: open && orderCode.length > 0,
  });
  const order = detailQuery.data;
  const [nextStatus, setNextStatus] = useState<OrderStatus | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (order?.status) {
      const firstAllowed = ALLOWED_NEXT_STATUSES[order.status]?.[0];
      setNextStatus(firstAllowed);
    }
  }, [order?.status]);
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
    onAfterMutation?.();
  };
  const updateStatusMutation = useMutation({
    mutationFn: () => {
      if (!nextStatus) {
        throw new Error('Vui lòng chọn trạng thái.');
      }
      return updateAdminOrderStatus(orderCode, nextStatus);
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật trạng thái đơn hàng.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const paymentMethodLabel = useMemo((): string => {
    const m = order?.payments[0]?.method as PaymentMethod | undefined;
    if (m === 'COD') return 'COD';
    if (m === 'BANK_TRANSFER_QR') return 'Chuyển khoản';
    return '—';
  }, [order]);
  const isMutating = updateStatusMutation.isPending;
  const allowedOptions = useMemo(() => {
    if (!order) {
      return [];
    }
    const allowedStatuses = new Set(ALLOWED_NEXT_STATUSES[order.status] ?? []);
    return ORDER_STATUS_FILTER_OPTIONS.filter((option) => allowedStatuses.has(option.value));
  }, [order]);
  const isUpdateDisabled = !order || !nextStatus || isMutating;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? `Chuyển trạng thái đơn hàng`}</DialogTitle>
          <DialogDescription>Chọn trạng thái mới và cập nhật thủ công.</DialogDescription>
        </DialogHeader>
        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
            Đang tải đơn…
          </div>
        ) : detailQuery.isError ? (
          <p className="text-sm text-destructive">{apiErrorMessage(detailQuery.error)}</p>
        ) : order ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="font-mono text-xs font-medium">{order.orderCode}</p>
              <p className="mt-1 text-muted-foreground">
                Tổng: <span className="font-medium text-foreground">{formatVnd(order.total)}</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Đơn: {getOrderStatusLabel(order.status)} · Thanh toán:{' '}
                {getPaymentStatusLabel(order.paymentStatus)} ({paymentMethodLabel})
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Select
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as OrderStatus)}
                disabled={isMutating || allowedOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {allowedOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allowedOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Đơn này không có trạng thái kế tiếp hợp lệ.
                </p>
              ) : null}
              <Button
                type="button"
                disabled={isUpdateDisabled}
                onClick={() => setConfirmOpen(true)}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Cập nhật trạng thái
              </Button>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận chuyển trạng thái?</AlertDialogTitle>
              <AlertDialogDescription>
                {order && nextStatus
                  ? `Đơn ${order.orderCode} sẽ chuyển từ "${getOrderStatusLabel(order.status)}" sang "${getOrderStatusLabel(nextStatus)}".`
                  : 'Bạn có chắc chắn muốn chuyển trạng thái?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isMutating}>
                Hủy
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                disabled={isUpdateDisabled}
                onClick={() => updateStatusMutation.mutate()}
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
