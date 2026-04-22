export type TrendDirection = 'up' | 'down' | 'flat';

export function computeMetricDelta(
  current: number,
  previous: number,
): { deltaPercent: number | null; trendDirection: TrendDirection } {
  if (previous === 0 && current === 0) {
    return { deltaPercent: 0, trendDirection: 'flat' };
  }
  if (previous === 0) {
    return { deltaPercent: null, trendDirection: current > 0 ? 'up' : 'flat' };
  }
  const raw = ((current - previous) / previous) * 100;
  const deltaPercent = Math.round(raw * 10) / 10;
  let trendDirection: TrendDirection = 'flat';
  if (deltaPercent > 0.05) {
    trendDirection = 'up';
  } else if (deltaPercent < -0.05) {
    trendDirection = 'down';
  }
  return { deltaPercent, trendDirection };
}

export function computeNullableRatioDelta(
  current: number | null,
  previous: number | null,
): { deltaPercent: number | null; trendDirection: TrendDirection } {
  if (current === null || previous === null) {
    return { deltaPercent: null, trendDirection: 'flat' };
  }
  return computeMetricDelta(current, previous);
}
