import { CustomerDetailView } from '@/app/customers/[customerId]/customer-detail-view';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Khách hàng · Chi tiết · Vnmixx' };

function CustomerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="h-4 w-full max-w-md rounded-md bg-muted" />
      </div>
      <div className="h-48 w-full rounded-xl border bg-muted/25" />
      <div className="h-64 w-full rounded-md border bg-muted/25" />
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <Suspense fallback={<CustomerDetailSkeleton />}>
        <CustomerDetailView />
      </Suspense>
    </div>
  );
}
