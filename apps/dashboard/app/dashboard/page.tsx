import { AnalyticsShell } from '@/components/analytics/analytics-shell';
import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tổng quan' };

export default function OverviewPage(): React.JSX.Element {
  return (
    <AnalyticsShell title="Tổng quan" description="" showExport>
      <OverviewDashboard />
    </AnalyticsShell>
  );
}
