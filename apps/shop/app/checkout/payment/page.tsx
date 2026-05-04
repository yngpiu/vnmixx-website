import { CheckoutPaymentPageContent } from '@/modules/cart/components/checkout-payment-page-content';
import { Suspense } from 'react';

function CheckoutPaymentFallback(): React.JSX.Element {
  return (
    <main className="shop-shell-container py-8">
      <div className="mb-6 h-10 max-w-md animate-pulse rounded-md bg-muted" />
      <section className="rounded-md border border-border p-6">
        <div className="mx-auto h-8 max-w-xs animate-pulse rounded bg-muted" />
        <p className="mx-auto mt-4 h-4 max-w-sm animate-pulse rounded bg-muted" />
      </section>
    </main>
  );
}

export default function CheckoutPaymentPage(): React.JSX.Element {
  return (
    <Suspense fallback={<CheckoutPaymentFallback />}>
      <CheckoutPaymentPageContent />
    </Suspense>
  );
}
