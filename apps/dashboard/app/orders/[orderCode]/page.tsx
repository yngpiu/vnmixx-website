import { OrderDetailView } from '@/app/orders/[orderCode]/order-detail-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-10 w-full max-w-md rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 rounded-xl border bg-muted/25" />
        <div className="h-40 rounded-xl border bg-muted/25" />
        <div className="h-40 rounded-xl border bg-muted/25" />
      </div>
      <div className="h-64 rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailView />
      </Suspense>
    </div>
  );
}
