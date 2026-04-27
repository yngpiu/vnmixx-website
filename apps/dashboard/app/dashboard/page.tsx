import { DashboardOverviewView } from '@/app/dashboard/dashboard-overview-view';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tổng quan' };

export default function DashboardOverviewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <DashboardOverviewView />
    </div>
  );
}
