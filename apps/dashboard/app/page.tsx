import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import { PageViewHeader } from '@/components/page-view-header';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Tổng quan · Vnmixx' };

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-48 rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-muted/30" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border bg-muted/25" />
        <div className="h-64 rounded-xl border bg-muted/25" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <PageViewHeader
        title="Tổng quan"
        description="Chỉ số đơn hàng và GMV — dữ liệu từ API quản trị phân tích."
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewDashboard />
      </Suspense>
    </div>
  );
}
