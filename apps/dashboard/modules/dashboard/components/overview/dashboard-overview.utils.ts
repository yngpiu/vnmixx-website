'use client';

export const shortDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'custom';

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return {
    from: toYmd(sevenDaysAgo),
    to: toYmd(now),
  };
}

export function getRangeByPreset(preset: Exclude<RangePreset, 'custom'>): { from: Date; to: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === 'today') return { from: startOfToday, to: endOfToday };

  if (preset === 'yesterday') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 1);
    const to = new Date(endOfToday);
    to.setDate(to.getDate() - 1);
    return { from, to };
  }

  if (preset === 'this_week') {
    const day = startOfToday.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(startOfToday);
    from.setDate(from.getDate() + mondayOffset);
    return { from, to: endOfToday };
  }

  if (preset === 'this_month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
  }

  return { from: new Date(now.getFullYear(), 0, 1), to: endOfToday };
}

export function formatDelta(value: number): string {
  const abs = Math.abs(value).toFixed(1);
  return `${abs}% so với kỳ trước`;
}

export function formatCompactVnd(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${value}`;
}

export function getDashboardOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_CONFIRMATION: 'Chờ xác nhận',
    PROCESSING: 'Đang xử lý',
    AWAITING_SHIPMENT: 'Chờ giao',
    SHIPPED: 'Đang giao',
    DELIVERED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Hoàn trả',
  };
  return labels[status] ?? status;
}

export function getDashboardOrderStatusClassName(status: string): string {
  const classNames: Record<string, string> = {
    PENDING_CONFIRMATION:
      'border-transparent bg-blue-50 text-blue-900 dark:bg-blue-950/70 dark:text-blue-100',
    PROCESSING:
      'border-transparent bg-cyan-50 text-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-100',
    AWAITING_SHIPMENT:
      'border-transparent bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-100',
    SHIPPED:
      'border-transparent bg-violet-50 text-violet-900 dark:bg-violet-950/70 dark:text-violet-100',
    DELIVERED:
      'border-transparent bg-emerald-50 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-100',
    CANCELLED: 'border-transparent bg-rose-50 text-rose-900 dark:bg-rose-950/70 dark:text-rose-100',
    RETURNED:
      'border-transparent bg-orange-50 text-orange-900 dark:bg-orange-950/70 dark:text-orange-100',
  };
  return classNames[status] ?? 'border-transparent bg-muted text-muted-foreground';
}

export function getTopRankClassName(index: number): string {
  if (index === 0) return 'bg-amber-400/20 text-amber-700';
  if (index === 1) return 'bg-slate-300/30 text-slate-700';
  if (index === 2) return 'bg-orange-300/30 text-orange-700';
  return 'bg-muted text-muted-foreground';
}
