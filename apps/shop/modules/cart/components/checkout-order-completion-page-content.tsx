'use client';

import { getMyOrderDetail } from '@/modules/cart/api/checkout';
import {
  CHECKOUT_STEP_FRAME_CLASS,
  CheckoutProgressSteps,
} from '@/modules/cart/components/checkout-progress-steps';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type PaymentErrorKind = 'expired' | 'failed' | 'cancelled';

function getPaymentErrorCopy(kind: PaymentErrorKind): { headline: string; detail: string } {
  switch (kind) {
    case 'expired':
      return {
        headline: 'Phiên thanh toán hết hạn',
        detail: 'Đơn hàng đã được hủy do quá thời gian thanh toán.',
      };
    case 'failed':
      return {
        headline: 'Thanh toán thất bại',
        detail: 'Đơn hàng đã được hủy. Bạn có thể đặt lại khi sẵn sàng.',
      };
    case 'cancelled':
      return {
        headline: 'Đơn hàng đã hủy',
        detail: 'Bạn đã hủy đơn hoặc đơn không còn hiệu lực thanh toán.',
      };
    default:
      return { headline: 'Không hoàn tất được', detail: '' };
  }
}

export function CheckoutOrderCompletionPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode') ?? '';
  const paymentResult = searchParams.get('paymentResult');
  const paymentErrorKind: PaymentErrorKind | null =
    paymentResult === 'expired' || paymentResult === 'failed' || paymentResult === 'cancelled'
      ? paymentResult
      : null;
  const isPaymentErrorResult = paymentErrorKind !== null;
  const paymentErrorCopy = paymentErrorKind ? getPaymentErrorCopy(paymentErrorKind) : null;
  const orderQuery = useQuery({
    queryKey: ['shop', 'me', 'order', orderCode],
    queryFn: () => getMyOrderDetail(orderCode),
    enabled: orderCode.length > 0,
  });
  const orderData = orderQuery.data;
  const displayOrderCode = orderData?.orderCode ?? orderCode;
  const trackOrderHref =
    orderCode.length > 0 ? `/me/order/${encodeURIComponent(displayOrderCode)}` : '/me/order';
  return (
    <main className="shop-shell-container py-8">
      <div className="mb-6">
        <CheckoutProgressSteps currentStep={3} />
      </div>
      <section className={cn(CHECKOUT_STEP_FRAME_CLASS, 'text-center')}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Hoàn thành đơn hàng
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-5 md:mt-10 md:gap-6">
          {orderCode.length === 0 ? (
            <>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Chưa có mã đơn
              </h1>
              <p className="text-balance text-base leading-relaxed text-muted-foreground">
                Không tìm thấy mã đơn trên liên kết. Kiểm tra đơn trong tài khoản hoặc quay lại giỏ
                hàng.
              </p>
            </>
          ) : orderQuery.isLoading ? (
            <>
              <div className="h-10 w-[min(100%,280px)] animate-pulse rounded-lg bg-muted md:h-12" />
              <div className="h-5 w-48 animate-pulse rounded bg-muted/80" />
            </>
          ) : isPaymentErrorResult && paymentErrorCopy ? (
            <>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-destructive md:text-4xl">
                {paymentErrorCopy.headline}
              </h1>
              <p className="text-balance text-base leading-relaxed text-muted-foreground">
                {paymentErrorCopy.detail}{' '}
                <span className="font-semibold text-foreground">Mã đơn: {orderCode}</span>
              </p>
            </>
          ) : orderQuery.isError ? (
            <>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Đặt hàng thành công
              </h1>
              <p className="text-balance text-base leading-relaxed text-muted-foreground">
                Đã ghi nhận đơn. Mã đơn hàng:{' '}
                <span className="font-semibold text-foreground">{orderCode}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Đặt hàng thành công
              </h1>
              <p className="text-balance text-base leading-relaxed text-muted-foreground">
                Cảm ơn bạn đã mua hàng. Mã đơn hàng:{' '}
                <span className="font-semibold text-foreground">{displayOrderCode}</span>
              </p>
            </>
          )}
        </div>
        <div className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:mx-auto sm:flex-row sm:justify-center md:mt-12">
          <PrimaryCtaButton asChild ctaVariant="filled" className="w-full! sm:w-auto! shrink-0">
            <Link href={trackOrderHref}>THEO DÕI ĐƠN HÀNG</Link>
          </PrimaryCtaButton>
          <PrimaryCtaButton asChild ctaVariant="outline" className="w-full! sm:w-auto! shrink-0">
            <Link href="/">TRỞ VỀ TRANG CHỦ</Link>
          </PrimaryCtaButton>
        </div>
      </section>
    </main>
  );
}
