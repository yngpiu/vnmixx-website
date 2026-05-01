'use client';

import { getMyOrderDetail } from '@/modules/cart/api/checkout';
import { CheckoutProgressSteps } from '@/modules/cart/components/checkout-progress-steps';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function CheckoutOrderCompletionPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode') ?? '';
  const paymentResult = searchParams.get('paymentResult');
  const isPaymentErrorResult =
    paymentResult === 'expired' || paymentResult === 'failed' || paymentResult === 'cancelled';
  const paymentErrorMessage =
    paymentResult === 'expired'
      ? 'Phiên thanh toán đã quá thời gian. Đơn hàng đã được hủy.'
      : paymentResult === 'failed'
        ? 'Thanh toán thất bại. Đơn hàng đã được hủy.'
        : paymentResult === 'cancelled'
          ? 'Đơn hàng đã được hủy.'
          : null;
  const orderQuery = useQuery({
    queryKey: ['shop', 'me', 'order', orderCode],
    queryFn: () => getMyOrderDetail(orderCode),
    enabled: orderCode.length > 0,
  });
  const orderData = orderQuery.data;
  return (
    <main className="shop-shell-container py-8">
      <div className="mb-6">
        <CheckoutProgressSteps currentStep={3} />
      </div>
      <section className="rounded-md border border-border p-6 text-center">
        <h1 className="text-2xl font-semibold">Hoàn thành đơn hàng</h1>
        {orderCode.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Không tìm thấy mã đơn hàng. Vui lòng kiểm tra lại đơn trong tài khoản của bạn.
          </p>
        ) : orderQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Đang tải thông tin đơn hàng...</p>
        ) : isPaymentErrorResult ? (
          <p className="mt-3 text-sm text-destructive">
            {paymentErrorMessage}{' '}
            <span className="font-medium text-foreground">Mã đơn hàng: {orderCode}</span>.
          </p>
        ) : orderQuery.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Đặt hàng thành công. Mã đơn hàng của bạn là{' '}
            <span className="font-medium text-foreground">{orderCode}</span>.
          </p>
        ) : orderData ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Đặt hàng thành công. Mã đơn hàng của bạn là{' '}
            <span className="font-medium text-foreground">{orderData.orderCode}</span>.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Đặt hàng thành công. Mã đơn hàng của bạn là{' '}
            <span className="font-medium text-foreground">{orderCode}</span>.
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <PrimaryCtaButton asChild className="w-auto!">
            <Link href="/tai-khoan">ĐI ĐẾN TÀI KHOẢN</Link>
          </PrimaryCtaButton>
        </div>
      </section>
    </main>
  );
}
