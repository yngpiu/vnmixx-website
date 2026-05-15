import { SepayTransactionsView } from '@/app/orders/sepay-transactions-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Lịch sử giao dịch SePay' };

function SepayTransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full max-w-md rounded-md bg-muted/80" />
      <div className="h-80 w-full rounded-md border bg-muted/25" />
    </div>
  );
}

export default function SepayTransactionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<SepayTransactionsSkeleton />}>
        <SepayTransactionsView />
      </Suspense>
    </div>
  );
}
