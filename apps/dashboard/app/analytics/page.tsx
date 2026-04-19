import { AnalyticsDashboard } from '@/modules/analytics/components/analytics-dashboard';
import { AnalyticsShell } from '@/modules/analytics/components/analytics/analytics-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Phân tích' };

export default function AnalyticsPage(): React.JSX.Element {
  return (
    <AnalyticsShell title="Phân tích" description="" showExport>
      <AnalyticsDashboard />
    </AnalyticsShell>
  );
}
