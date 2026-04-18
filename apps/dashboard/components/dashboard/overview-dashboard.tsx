'use client';

import { useAnalyticsDateRange } from '@/components/analytics/analytics-shell';
import { AovDeltaBadge, KpiDeltaBadge } from '@/components/analytics/kpi-delta-badge';
import {
  getAnalyticsKpisWithDelta,
  getAnalyticsPendingOrders,
  getAnalyticsReviewsSummary,
  getAnalyticsTimeseries,
  getAnalyticsTopProducts,
  getAnalyticsTopShippingCities,
} from '@/lib/api/analytics';
import { formatVnd } from '@/lib/format-vnd';
import { getOrderStatusLabel } from '@/lib/order-status-labels';
import type { OrderStatus } from '@/lib/types/order-admin';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@repo/ui/components/ui/chart';
import { Input } from '@repo/ui/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  Loader2Icon,
  StarIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const gmvChartConfig = {
  gmv: {
    label: 'GMV',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

function compactMoney(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} k`;
  return formatVnd(value);
}

function statusTone(status: string): string {
  if (status === 'DELIVERED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'PENDING') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-muted text-muted-foreground border-border';
}

function shellCardClassName(): string {
  return 'rounded-2xl border border-[#ececec] bg-white shadow-none';
}

export function OverviewDashboard(): React.JSX.Element {
  const { range } = useAnalyticsDateRange();
  const kpisQuery = useQuery({
    queryKey: ['analytics', 'kpis-with-delta', range],
    queryFn: () => getAnalyticsKpisWithDelta(range),
  });
  const timeseriesQuery = useQuery({
    queryKey: ['analytics', 'timeseries', range],
    queryFn: () => getAnalyticsTimeseries(range),
  });
  const pendingQuery = useQuery({
    queryKey: ['analytics', 'pending-orders', range],
    queryFn: () => getAnalyticsPendingOrders(range),
  });
  const reviewsQuery = useQuery({
    queryKey: ['analytics', 'reviews-summary', range],
    queryFn: () => getAnalyticsReviewsSummary(range),
  });
  const citiesQuery = useQuery({
    queryKey: ['analytics', 'top-cities', range],
    queryFn: () => getAnalyticsTopShippingCities({ ...range, limit: 5 }),
  });
  const topProductsQuery = useQuery({
    queryKey: ['analytics', 'top-products', range],
    queryFn: () => getAnalyticsTopProducts(range),
  });
  const gmvSeries = useMemo(() => {
    const rows = timeseriesQuery.data?.data ?? [];
    return rows.map((row) => ({ ...row, label: row.bucketDate.slice(5) }));
  }, [timeseriesQuery.data?.data]);
  if (kpisQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" />
        Đang tải tổng quan...
      </div>
    );
  }
  if (kpisQuery.isError) {
    const msg = isAxiosError(kpisQuery.error)
      ? String(kpisQuery.error.response?.data ?? kpisQuery.error.message)
      : kpisQuery.error instanceof Error
        ? kpisQuery.error.message
        : 'Không tải được dữ liệu phân tích.';
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <p>{msg}</p>
      </div>
    );
  }
  const kpis = kpisQuery.data!.kpis;
  const deltas = kpisQuery.data!.deltas;
  return (
    <div className="flex flex-col gap-5 bg-[#fafafa]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">GMV</span>
              <KpiDeltaBadge delta={deltas.gmv} />
            </div>
            <CardTitle className="text-2xl font-semibold">{compactMoney(kpis.gmv)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">Đơn tạo</span>
              <KpiDeltaBadge delta={deltas.ordersCreatedCount} />
            </div>
            <CardTitle className="text-2xl font-semibold">{kpis.ordersCreatedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">Doanh thu hoàn thành</span>
              <KpiDeltaBadge delta={deltas.ordersCompletedCount} />
            </div>
            <CardTitle className="text-2xl font-semibold">
              {compactMoney(kpis.completedRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">AOV</span>
              <AovDeltaBadge delta={deltas.aovCompleted} />
            </div>
            <CardTitle className="text-2xl font-semibold">
              {kpis.aovCompleted === null ? '-' : compactMoney(kpis.aovCompleted)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card className={shellCardClassName()}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={gmvChartConfig} className="min-h-[180px] w-full">
            <AreaChart data={gmvSeries} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="gmv"
                type="monotone"
                stroke="var(--color-gmv)"
                fill="var(--color-gmv)"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales by Location</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <DownloadIcon className="mr-1 size-3" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {(citiesQuery.data?.cities ?? []).map((city) => {
              const max = Math.max(...(citiesQuery.data?.cities ?? []).map((row) => row.gmv), 1);
              const percent = Math.round((city.gmv / max) * 100);
              return (
                <div key={city.city} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{city.city}</span>
                    <span className="tabular-nums">{percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#ececec]">
                    <div
                      className="h-2 rounded-full bg-black"
                      style={{ width: `${Math.max(percent, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đánh giá khách hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center gap-3">
              <div className="flex text-amber-400">
                {[0, 1, 2, 3, 4].map((value) => (
                  <StarIcon key={value} className="size-4 fill-current" />
                ))}
              </div>
              <p className="text-2xl font-semibold tabular-nums">
                {reviewsQuery.data?.averageRating ?? 0}
              </p>
            </div>
            {(reviewsQuery.data?.ratingBreakdown ?? []).map((row) => {
              const total = reviewsQuery.data?.totalReviews ?? 1;
              const width = Math.max(6, (row.count / total) * 100);
              return (
                <div key={row.rating} className="flex items-center gap-2 text-sm">
                  <span className="w-5">{row.rating}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#ececec]">
                    <div className="h-2 rounded-full bg-black" style={{ width: `${width}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums">{row.count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <DownloadIcon className="mr-1 size-3" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Filter orders..." className="h-9 bg-white" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pendingQuery.data?.recentOrdersNeedingAction ?? []).slice(0, 8).map((row) => (
                  <TableRow key={row.orderCode}>
                    <TableCell className="font-mono text-xs">#{row.orderCode.slice(-4)}</TableCell>
                    <TableCell className="max-w-[170px] truncate">{row.customerFullName}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatVnd(row.total)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          statusTone(row.status),
                        )}
                      >
                        {getOrderStatusLabel(row.status as OrderStatus)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-1">
              <Button variant="outline" size="icon" className="size-7">
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-7">
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className={shellCardClassName()}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Best Selling Products</CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <DownloadIcon className="mr-1 size-3" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Filter products..." className="h-9 bg-white" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-end">Sold</TableHead>
                  <TableHead className="text-end">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topProductsQuery.data?.products ?? []).slice(0, 8).map((row) => (
                  <TableRow key={row.productName}>
                    <TableCell className="max-w-[220px] truncate">{row.productName}</TableCell>
                    <TableCell className="text-end tabular-nums">{row.unitsSold}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatVnd(row.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-1">
              <Button variant="outline" size="icon" className="size-7">
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-7">
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
