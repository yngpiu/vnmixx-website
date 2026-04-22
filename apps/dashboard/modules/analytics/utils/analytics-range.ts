/**
 * Returns inclusive UTC calendar dates as `YYYY-MM-DD` for API `from` / `to`.
 */
export function getInclusiveUtcDateRange(days: number): { from: string; to: string } {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { from: formatUtcIsoDate(start), to: formatUtcIsoDate(end) };
}

function formatUtcIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
