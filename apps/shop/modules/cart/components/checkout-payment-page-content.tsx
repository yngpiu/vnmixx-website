'use client';

import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { cancelMyOrder, getMyOrderDetail } from '@/modules/cart/api/checkout';
import { CheckoutProgressSteps } from '@/modules/cart/components/checkout-progress-steps';
import {
  createOrderPaymentSocket,
  type OrderPaymentUpdatedEvent,
} from '@/modules/cart/lib/order-payment-socket';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { toast } from '@repo/ui/components/ui/sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

export function CheckoutPaymentPageContent(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode') ?? '';
  const orderQuery = useQuery({
    queryKey: ['shop', 'me', 'order', orderCode, 'payment'],
    queryFn: () => getMyOrderDetail(orderCode),
    enabled: orderCode.length > 0,
    refetchInterval: (query) => (query.state.data?.paymentStatus === 'PENDING' ? 15000 : false),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const cancelOrderMutation = useMutation({
    mutationFn: () => cancelMyOrder(orderCode),
    onSuccess: () => {
      toast.success('Đã hủy đơn hàng.');
      router.replace(
        `/dat-hang/hoan-thanh?orderCode=${encodeURIComponent(orderCode)}&paymentResult=cancelled`,
      );
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Không thể hủy đơn hàng lúc này.');
    },
  });
  const paymentStatus = orderQuery.data?.paymentStatus;
  const isPaymentSuccess = paymentStatus === 'SUCCESS';
  const isPaymentFailed = paymentStatus === 'FAILED';
  const isPaymentExpired = paymentStatus === 'EXPIRED';
  const isOrderCancelled = paymentStatus === 'CANCELLED';
  const shouldShowTerminalState = isPaymentFailed || isPaymentExpired || isOrderCancelled;
  const orderData = orderQuery.data;
  const checkoutSession = orderData?.checkoutSession;
  useEffect(() => {
    if (orderCode.length === 0) {
      return;
    }
    if (orderQuery.data?.paymentStatus !== 'SUCCESS') {
      return;
    }
    router.replace(`/dat-hang/hoan-thanh?orderCode=${encodeURIComponent(orderCode)}`);
  }, [orderCode, orderQuery.data?.paymentStatus, router]);
  useEffect(() => {
    if (orderCode.length === 0 || orderQuery.isLoading || orderQuery.isError) {
      return;
    }
    if (!shouldShowTerminalState) {
      return;
    }
    const paymentResult = isPaymentExpired ? 'expired' : isPaymentFailed ? 'failed' : 'cancelled';
    router.replace(
      `/dat-hang/hoan-thanh?orderCode=${encodeURIComponent(orderCode)}&paymentResult=${paymentResult}`,
    );
  }, [
    isPaymentExpired,
    isPaymentFailed,
    orderCode,
    orderQuery.isError,
    orderQuery.isLoading,
    router,
    shouldShowTerminalState,
  ]);
  useEffect(() => {
    if (!accessToken || orderCode.length === 0) {
      return;
    }
    const socket = createOrderPaymentSocket(accessToken);
    socket.connect();
    socket.emit('watchOrderPayment', { orderCode });
    socket.on('orderPaymentUpdated', (event: OrderPaymentUpdatedEvent) => {
      if (event.orderCode !== orderCode) {
        return;
      }
      if (event.paymentStatus !== 'SUCCESS') {
        void queryClient.invalidateQueries({
          queryKey: ['shop', 'me', 'order', orderCode, 'payment'],
        });
        return;
      }
      router.replace(`/dat-hang/hoan-thanh?orderCode=${encodeURIComponent(orderCode)}`);
    });
    return () => {
      socket.disconnect();
    };
  }, [accessToken, orderCode, queryClient, router]);

  return (
    <main className="shop-shell-container py-8">
      <div className="mb-6">
        <CheckoutProgressSteps currentStep={2} />
      </div>
      <section className="rounded-md border border-border p-6 text-center">
        <h1 className="text-2xl font-semibold">Thanh toán đơn hàng</h1>
        {orderCode.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Không tìm thấy mã đơn hàng để thanh toán.
          </p>
        ) : orderQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Đang tải thông tin thanh toán...</p>
        ) : orderQuery.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">Không thể tải thông tin thanh toán.</p>
        ) : checkoutSession ? (
          <div className="mt-5 space-y-5">
            <p className="rounded-md bg-muted/40 px-4 py-3 text-sm text-foreground">
              Vui lòng chuyển khoản đúng số tiền với nội dung{' '}
              <span className="font-semibold">{checkoutSession.transferContent}</span> để hệ thống
              tự động xác nhận thanh toán.
            </p>
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="relative h-[320px] w-[320px] border border-border p-2">
                  <Image
                    src={checkoutSession.qrImageUrl}
                    alt="Mã QR thanh toán"
                    fill
                    sizes="320px"
                    className="object-contain p-2"
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm leading-6">
                <p>
                  Mã đơn hàng: <span className="font-medium">{orderData.orderCode}</span>
                </p>
                <p>
                  Ngân hàng: <span className="font-medium">{checkoutSession.bankName}</span>
                </p>
                <p>
                  Số tài khoản: <span className="font-medium">{checkoutSession.accountNumber}</span>
                </p>
                <p>
                  Chủ tài khoản: <span className="font-medium">{checkoutSession.accountName}</span>
                </p>
                <p>
                  Số tiền:{' '}
                  <span className="font-medium">{formatMoney(checkoutSession.amount)}</span>
                </p>
                <p>
                  Nội dung CK:{' '}
                  <span className="font-medium">{checkoutSession.transferContent}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Đơn hàng này không có phiên thanh toán QR khả dụng.
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <PrimaryCtaButton
            ctaVariant="outline"
            className="w-auto!"
            onClick={() => cancelOrderMutation.mutate()}
            disabled={
              cancelOrderMutation.isPending ||
              orderQuery.isLoading ||
              isPaymentSuccess ||
              shouldShowTerminalState
            }
          >
            {cancelOrderMutation.isPending ? 'ĐANG HỦY...' : 'HỦY ĐƠN HÀNG'}
          </PrimaryCtaButton>
        </div>
      </section>
    </main>
  );
}
