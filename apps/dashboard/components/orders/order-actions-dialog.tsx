'use client';

import {
  cancelAdminOrder,
  confirmAdminOrder,
  confirmAdminOrderPayment,
  getAdminOrder,
  type ConfirmOrderShipmentInput,
} from '@/lib/api/orders';
import type { OrderAdminDetail, PaymentMethod } from '@/types/order-admin';
import { formatVnd } from '@/utils/format-vnd';
import { getOrderStatusLabel, getPaymentStatusLabel } from '@/utils/order-status-labels';
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@repo/ui/components/ui/input-group';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Loader2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi.';
}

function canConfirmPayment(order: OrderAdminDetail): boolean {
  const payment = order.payments[0];
  return Boolean(payment?.method === 'BANK_TRANSFER' && payment.status !== 'SUCCESS');
}

function canConfirmOrder(order: OrderAdminDetail): boolean {
  if (order.status !== 'PENDING') {
    return false;
  }
  const payment = order.payments[0];
  if (!payment) {
    return true;
  }
  if (payment.method === 'COD') {
    return true;
  }
  if (payment.method === 'BANK_TRANSFER' && payment.status === 'SUCCESS') {
    return true;
  }
  return false;
}

function canCancelOrder(order: OrderAdminDetail): boolean {
  const blocked: OrderAdminDetail['status'][] = ['DELIVERED', 'CANCELLED', 'RETURNED'];
  return !blocked.includes(order.status);
}

export function OrderActionsDialog(props: {
  orderCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onAfterMutation?: () => void;
}) {
  const { orderCode, open, onOpenChange, title, onAfterMutation } = props;
  const [shipment, setShipment] = useState<ConfirmOrderShipmentInput>({
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
  });
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['orders', 'admin', 'detail', orderCode],
    queryFn: () => getAdminOrder(orderCode),
    enabled: open && orderCode.length > 0,
  });
  const order = detailQuery.data;
  useEffect(() => {
    if (!order) {
      return;
    }
    setShipment({
      weight: order.packageWeight,
      length: order.packageLength,
      width: order.packageWidth,
      height: order.packageHeight,
    });
  }, [order]);
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
    onAfterMutation?.();
  };
  const confirmPayMutation = useMutation({
    mutationFn: () => confirmAdminOrderPayment(orderCode),
    onSuccess: async () => {
      toast.success('Đã xác nhận thanh toán chuyển khoản.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const confirmOrderMutation = useMutation({
    mutationFn: () => confirmAdminOrder(orderCode, shipment),
    onSuccess: async () => {
      toast.success('Đã xác nhận đơn và tạo vận đơn GHN.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelAdminOrder(orderCode),
    onSuccess: async () => {
      toast.success('Đã hủy đơn hàng.');
      await invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const paymentMethodLabel = useMemo((): string => {
    const m = order?.payments[0]?.method as PaymentMethod | undefined;
    if (m === 'COD') return 'COD';
    if (m === 'BANK_TRANSFER') return 'Chuyển khoản';
    return '—';
  }, [order]);
  const isMutating =
    confirmPayMutation.isPending || confirmOrderMutation.isPending || cancelMutation.isPending;
  const isShipmentValid =
    shipment.weight >= 1 && shipment.length >= 1 && shipment.width >= 1 && shipment.height >= 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? `Thao tác đơn hàng`}</DialogTitle>
          <DialogDescription>
            Các thao tác tuân theo quy tắc nghiệp vụ trên server (GHN, tồn kho, thanh toán).
          </DialogDescription>
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
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3">
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground">Khối lượng (g)</span>
                  <InputGroup className="h-8">
                    <InputGroupInput
                      type="number"
                      min={1}
                      value={shipment.weight}
                      onChange={(e) =>
                        setShipment((prev) => ({
                          ...prev,
                          weight: Number.parseInt(e.target.value || '0', 10) || 0,
                        }))
                      }
                      disabled={isMutating}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>g</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground">Dài (cm)</span>
                  <InputGroup className="h-8">
                    <InputGroupInput
                      type="number"
                      min={1}
                      value={shipment.length}
                      onChange={(e) =>
                        setShipment((prev) => ({
                          ...prev,
                          length: Number.parseInt(e.target.value || '0', 10) || 0,
                        }))
                      }
                      disabled={isMutating}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>cm</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground">Rộng (cm)</span>
                  <InputGroup className="h-8">
                    <InputGroupInput
                      type="number"
                      min={1}
                      value={shipment.width}
                      onChange={(e) =>
                        setShipment((prev) => ({
                          ...prev,
                          width: Number.parseInt(e.target.value || '0', 10) || 0,
                        }))
                      }
                      disabled={isMutating}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>cm</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground">Cao (cm)</span>
                  <InputGroup className="h-8">
                    <InputGroupInput
                      type="number"
                      min={1}
                      value={shipment.height}
                      onChange={(e) =>
                        setShipment((prev) => ({
                          ...prev,
                          height: Number.parseInt(e.target.value || '0', 10) || 0,
                        }))
                      }
                      disabled={isMutating}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>cm</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </label>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!canConfirmPayment(order) || isMutating}
                onClick={() => confirmPayMutation.mutate()}
              >
                {confirmPayMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Xác nhận thanh toán chuyển khoản
              </Button>
              <p className="text-xs text-muted-foreground">
                Chỉ áp dụng khi đơn dùng chuyển khoản và thanh toán chưa thành công.
              </p>
              <Button
                type="button"
                disabled={!canConfirmOrder(order) || !isShipmentValid || isMutating}
                onClick={() => confirmOrderMutation.mutate()}
              >
                {confirmOrderMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Xác nhận đơn &amp; tạo vận đơn GHN
              </Button>
              <p className="text-xs text-muted-foreground">
                Chỉ khi đơn ở trạng thái chờ xử lý; cần nhập đủ cân nặng và kích thước kiện trước
                khi tạo vận đơn GHN.
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={!canCancelOrder(order) || isMutating}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Hủy đơn hàng
              </Button>
              <p className="text-xs text-muted-foreground">
                Không thể hủy khi đã giao, đã hủy hoặc hoàn trả. Có thể gọi hủy vận đơn GHN nếu có.
              </p>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
