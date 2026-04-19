import { AnalyticsShell } from '@/components/analytics/analytics-shell';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Phân tích' };

export default function AnalyticsPage(): React.JSX.Element {
  return (
    <AnalyticsShell title="Phân tích" description="" showExport>
      <AnalyticsDashboard />
    </AnalyticsShell>
  );
}
