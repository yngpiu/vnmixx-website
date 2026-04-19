'use client';

import { getInclusiveUtcDateRange } from '@/modules/analytics/utils/analytics-range';
import { PageViewHeader } from '@/modules/common/components/page-view-header';
import { Button } from '@repo/ui/components/ui/button';
import { Calendar } from '@repo/ui/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';
import { vi as viLocale } from 'date-fns/locale';
import { CalendarIcon, Loader2Icon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DateRange } from 'react-day-picker';

export type AnalyticsDateRangeValue = { from: string; to: string };

type AnalyticsDateRangeContextValue = {
  range: AnalyticsDateRangeValue;
};

const AnalyticsDateRangeContext = createContext<AnalyticsDateRangeContextValue | null>(null);

export function useAnalyticsDateRange(): AnalyticsDateRangeContextValue {
  const ctx = useContext(AnalyticsDateRangeContext);
  if (!ctx) {
    throw new Error('useAnalyticsDateRange must be used within AnalyticsShell');
  }
  return ctx;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseRangeFromSearch(searchParams: URLSearchParams): AnalyticsDateRangeValue {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to) {
    return { from, to };
  }
  return getInclusiveUtcDateRange(30);
}

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function ymdToUtcDate(ymd: string): Date {
  const parts = ymd.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

function toRange(from: Date, to: Date): AnalyticsDateRangeValue {
  return { from: formatUtcYmd(from), to: formatUtcYmd(to) };
}

function getPresetRanges(
  now: Date,
): Array<{ id: string; label: string; range: AnalyticsDateRangeValue }> {
  const today = startOfUtcDay(now);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dayOfWeek = today.getUTCDay() || 7;
  const thisWeekFrom = new Date(today);
  thisWeekFrom.setUTCDate(thisWeekFrom.getUTCDate() - (dayOfWeek - 1));
  const thisMonthFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastMonthFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastMonthTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const thisYearFrom = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  return [
    { id: 'today', label: 'Hôm nay', range: toRange(today, today) },
    { id: 'yesterday', label: 'Hôm qua', range: toRange(yesterday, yesterday) },
    { id: 'this-week', label: 'Tuần này', range: toRange(thisWeekFrom, today) },
    { id: 'last-7-days', label: '7 ngày qua', range: getInclusiveUtcDateRange(7) },
    { id: 'last-28-days', label: '28 ngày qua', range: getInclusiveUtcDateRange(28) },
    { id: 'this-month', label: 'Tháng này', range: toRange(thisMonthFrom, today) },
    { id: 'last-month', label: 'Tháng trước', range: toRange(lastMonthFrom, lastMonthTo) },
    { id: 'this-year', label: 'Năm nay', range: toRange(thisYearFrom, today) },
  ];
}

type AnalyticsShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  /** Hiển thị link tải báo cáo (placeholder) — có thể mở rộng sau */
  showExport?: boolean;
};

function AnalyticsShellBody(props: AnalyticsShellProps): React.JSX.Element {
  const { title, description, children, showExport = false } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRangeState] = useState<AnalyticsDateRangeValue>(() =>
    parseRangeFromSearch(searchParams),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const presetRanges = useMemo(() => getPresetRanges(new Date()), []);
  const syncUrl = useCallback(
    (next: AnalyticsDateRangeValue) => {
      const qs = new URLSearchParams(searchParams.toString());
      qs.set('from', next.from);
      qs.set('to', next.to);
      router.replace(`${pathname}?${qs.toString()}`);
    },
    [pathname, router, searchParams],
  );
  useEffect(() => {
    const fromUrl = parseRangeFromSearch(searchParams);
    setRangeState((prev) =>
      prev.from === fromUrl.from && prev.to === fromUrl.to ? prev : fromUrl,
    );
  }, [searchParams]);
  useEffect(() => {
    if (!searchParams.get('from') || !searchParams.get('to')) {
      const next = getInclusiveUtcDateRange(30);
      syncUrl(next);
    }
  }, [pathname, router, searchParams, syncUrl]);
  const contextValue = useMemo(() => ({ range }), [range]);
  const rangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${formatter.format(ymdToUtcDate(range.from))} - ${formatter.format(ymdToUtcDate(range.to))}`;
  }, [range.from, range.to]);
  const activePresetId = useMemo(
    () =>
      presetRanges.find(
        (preset) => preset.range.from === range.from && preset.range.to === range.to,
      )?.id,
    [presetRanges, range.from, range.to],
  );
  const selectedRange: DateRange | undefined = useMemo(
    () => ({
      from: ymdToUtcDate(range.from),
      to: ymdToUtcDate(range.to),
    }),
    [range.from, range.to],
  );
  const onCalendarSelect = (value: DateRange | undefined) => {
    if (!value?.from) {
      return;
    }
    const fromStr = formatUtcYmd(value.from);
    const toStr = value.to ? formatUtcYmd(value.to) : fromStr;
    if (fromStr <= toStr) {
      const next = { from: fromStr, to: toStr };
      setRangeState(next);
      syncUrl(next);
      if (value.to) {
        setCalendarOpen(false);
      }
    }
  };
  return (
    <AnalyticsDateRangeContext.Provider value={contextValue}>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <PageViewHeader title={title} description={description} />
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {showExport ? (
              <Button type="button" variant="outline" size="sm" disabled className="shrink-0">
                Tải xuống
              </Button>
            ) : null}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn('min-w-[220px] justify-start text-left font-normal')}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
                  <span className="tabular-nums">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                <div className="grid grid-cols-[190px_auto]">
                  <div className="border-r bg-muted/20 p-3">
                    <div className="flex flex-col gap-1">
                      {presetRanges.map((preset) => (
                        <Button
                          key={preset.id}
                          type="button"
                          variant="ghost"
                          className={cn(
                            'justify-start rounded-md font-normal',
                            preset.id === activePresetId && 'bg-muted font-medium',
                          )}
                          onClick={() => {
                            setRangeState(preset.range);
                            syncUrl(preset.range);
                            setCalendarOpen(false);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      timeZone="UTC"
                      captionLayout="dropdown"
                      locale={viLocale}
                      selected={selectedRange}
                      onSelect={onCalendarSelect}
                      defaultMonth={ymdToUtcDate(range.from)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {children}
      </div>
    </AnalyticsDateRangeContext.Provider>
  );
}

function AnalyticsShellFallback(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <div className="h-16 w-full max-w-md animate-pulse rounded-lg bg-muted" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Đang tải bộ lọc…
      </div>
    </div>
  );
}

export function AnalyticsShell(props: AnalyticsShellProps): React.JSX.Element {
  return (
    <Suspense fallback={<AnalyticsShellFallback />}>
      <AnalyticsShellBody {...props} />
    </Suspense>
  );
}
