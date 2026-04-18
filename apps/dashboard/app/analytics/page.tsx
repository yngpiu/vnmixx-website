import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import { PageViewHeader } from '@/components/page-view-header';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Phân tích · Vnmixx' };

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-56 rounded-md bg-muted" />
      <div className="h-9 w-64 rounded-md bg-muted" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-muted/30" />
        ))}
      </div>
      <div className="h-72 rounded-xl border bg-muted/25" />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <PageViewHeader
        title="Phân tích"
        description="Biểu đồ và bảng theo khoảng thời gian — GMV theo đơn tạo; hoàn thành theo cập nhật trạng thái giao."
      />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
