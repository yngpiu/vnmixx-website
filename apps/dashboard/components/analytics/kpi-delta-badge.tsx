'use client';

import type { MetricDelta, NullableMetricDelta } from '@/types/analytics';
import { cn } from '@repo/ui/lib/utils';

function isPositiveOutcome(delta: MetricDelta): boolean {
  if (delta.trendDirection === 'flat') {
    return true;
  }
  if (delta.higherIsBetter) {
    return delta.trendDirection === 'up';
  }
  return delta.trendDirection === 'down';
}

export function KpiDeltaBadge({ delta }: { delta: MetricDelta }): React.JSX.Element {
  if (delta.deltaPercent === null) {
    return (
      <span className="text-[11px] font-normal tabular-nums text-muted-foreground">— kỳ trước</span>
    );
  }
  const positive = isPositiveOutcome(delta);
  const sign = delta.deltaPercent > 0 ? '+' : '';
  return (
    <span
      className={cn(
        'text-[11px] font-medium tabular-nums',
        positive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
      )}
    >
      {sign}
      {delta.deltaPercent.toFixed(1)}%
    </span>
  );
}

export function AovDeltaBadge({ delta }: { delta: NullableMetricDelta }): React.JSX.Element {
  if (delta.deltaPercent === null) {
    return <span className="text-[11px] font-normal text-muted-foreground">— kỳ trước</span>;
  }
  const fake: MetricDelta = {
    current: delta.current ?? 0,
    previous: delta.previous ?? 0,
    deltaPercent: delta.deltaPercent,
    trendDirection: delta.trendDirection,
    higherIsBetter: delta.higherIsBetter,
  };
  return <KpiDeltaBadge delta={fake} />;
}
