'use client';

import { formatVnd } from '@/modules/common/utils/format-vnd';
import {
  getDashboardCategoryRevenue,
  getDashboardKpis,
  getDashboardOrderStatusDistribution,
  getDashboardRecentOrders,
  getDashboardRevenueTrend,
  getDashboardSummaryMetrics,
  getDashboardTopProducts,
  getInventoryLowStock,
} from '@/modules/dashboard/api/dashboard';
import {
  buildDefaultRange,
  formatCompactVnd,
  getDashboardOrderStatusClassName,
  getDashboardOrderStatusLabel,
  getTopRankClassName,
  shortDateFormatter,
  toYmd,
  type RangePreset,
} from '@/modules/dashboard/components/overview/dashboard-overview.utils';
import { DateRangeFilter } from '@/modules/dashboard/components/overview/date-range-filter';
import { KpiCard } from '@/modules/dashboard/components/overview/kpi-card';
import { ProductListItem } from '@/modules/dashboard/components/overview/product-list-item';
import type { DashboardKpiCard } from '@/modules/dashboard/types/dashboard';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Table, TableBody, TableCell, TableRow } from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

const revenueChartConfig = {
  value: { label: 'Doanh thu', color: 'var(--chart-1)' },
} as const;

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#64748b'];

function renderCategoryRevenueTooltip(
  value: string | number | readonly (string | number)[] | undefined,
  name: string,
  item: { payload?: { percentage?: number }; color?: string },
) {
  const percentage = item.payload?.percentage ?? 0;
  const swatchColor = item.color ?? '#64748b';
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  return (
    <div className="flex min-w-[150px] flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: swatchColor }} />
        {name}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {formatVnd(numericValue)}
      </span>
      <span className="text-xs text-muted-foreground">Tỷ trọng: {percentage}%</span>
    </div>
  );
}

function renderOrderStatusTooltip(
  value: string | number | readonly (string | number)[] | undefined,
  name: string,
  item: { payload?: { percentage?: number }; color?: string },
) {
  const percentage = item.payload?.percentage ?? 0;
  const swatchColor = item.color ?? '#64748b';
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  return (
    <div className="flex min-w-[150px] flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: swatchColor }} />
        {name}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {numericValue.toLocaleString('vi-VN')} đơn
      </span>
      <span className="text-xs text-muted-foreground">Tỷ trọng: {percentage}%</span>
    </div>
  );
}

export function DashboardOverviewView() {
  const [preset, setPreset] = useState<RangePreset>('custom');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');

  const dateParams = useMemo(() => {
    if (!dateRange?.from) {
      return null;
    }
    return {
      from: toYmd(dateRange.from),
      to: toYmd(dateRange?.to ?? dateRange.from),
      timezone: 'Asia/Ho_Chi_Minh',
      compare: 'previous_period' as const,
    };
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => {
    const defaultRange = buildDefaultRange();
    setDateRange({
      from: new Date(defaultRange.from),
      to: new Date(defaultRange.to),
    });
  }, []);

  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis', dateParams],
    queryFn: () => getDashboardKpis(dateParams!),
    enabled: !!dateParams,
  });
  const revenueTrendQuery = useQuery({
    queryKey: ['dashboard', 'revenue-trend', dateParams, groupBy],
    queryFn: () => getDashboardRevenueTrend({ ...dateParams!, groupBy }),
    enabled: !!dateParams,
  });
  const orderStatusQuery = useQuery({
    queryKey: ['dashboard', 'order-status-distribution', dateParams],
    queryFn: () => getDashboardOrderStatusDistribution(dateParams!),
    enabled: !!dateParams,
  });
  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top-products', dateParams],
    queryFn: () => getDashboardTopProducts({ ...dateParams!, limit: 5, metric: 'quantity' }),
    enabled: !!dateParams,
  });
  const categoryRevenueQuery = useQuery({
    queryKey: ['dashboard', 'category-revenue', dateParams],
    queryFn: () => getDashboardCategoryRevenue({ ...dateParams!, limit: 5 }),
    enabled: !!dateParams,
  });
  const lowStockQuery = useQuery({
    queryKey: ['dashboard', 'inventory', 'low-stock'],
    queryFn: () =>
      getInventoryLowStock({ threshold: 20, includeOutOfStock: true, page: 1, limit: 5 }),
  });
  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => getDashboardRecentOrders({ limit: 8 }),
  });
  const summaryMetricsQuery = useQuery({
    queryKey: ['dashboard', 'summary-metrics', dateParams],
    queryFn: () => getDashboardSummaryMetrics(dateParams!),
    enabled: !!dateParams,
  });

  const kpiCards = useMemo(() => kpisQuery.data?.cards ?? [], [kpisQuery.data?.cards]);
  const revenueBuckets = revenueTrendQuery.data?.buckets ?? [];
  const statusSegments = orderStatusQuery.data?.segments ?? [];
  const categorySegments = categoryRevenueQuery.data?.segments ?? [];
  const topProducts = topProductsQuery.data?.items ?? [];
  const lowStockItems = lowStockQuery.data?.data ?? [];
  const recentOrders = recentOrdersQuery.data?.items ?? [];
  const summaryMetrics = summaryMetricsQuery.data?.metrics ?? [];
  const averageRatingMetric = summaryMetrics.find((metric) => metric.key === 'averageRating');
  const topKpiCards = useMemo(() => {
    if (!averageRatingMetric) {
      return kpiCards;
    }
    return [
      ...kpiCards,
      {
        key: 'averageRating',
        label: averageRatingMetric.label,
        value: averageRatingMetric.value,
        deltaPercent: averageRatingMetric.deltaPercent,
        trend: averageRatingMetric.trend,
      } satisfies DashboardKpiCard,
    ];
  }, [kpiCards, averageRatingMetric]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Xin chào, Admin!</h1>
          <p className="text-sm text-muted-foreground">
            Đây là tổng quan tình hình kinh doanh của cửa hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter
            preset={preset}
            setPreset={setPreset}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        </div>
      </div>

      <div
        className={cn(
          'grid gap-4 md:grid-cols-2 xl:grid-cols-5',
          kpisQuery.isFetching && 'opacity-70',
        )}
      >
        {topKpiCards.map((card) => (
          <KpiCard key={card.key} card={card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <Card className="flex h-full min-h-[360px] flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Doanh thu</CardTitle>
                <CardDescription>
                  {kpiCards.find((card) => card.key === 'revenue')?.label}
                </CardDescription>
              </div>
              <Select
                value={groupBy}
                onValueChange={(value) => setGroupBy(value as 'day' | 'month' | 'year')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Theo ngày</SelectItem>
                  <SelectItem value="month">Theo tháng</SelectItem>
                  <SelectItem value="year">Theo năm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1">
            <ChartContainer config={revenueChartConfig} className="h-full min-h-[300px] w-full">
              <LineChart data={revenueBuckets}>
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => formatCompactVnd(value)}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(value) => formatVnd(Number(value))} />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex h-full min-h-[360px] flex-col">
          <CardHeader>
            <CardTitle>Đơn hàng theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="grid flex-1 grid-rows-[auto_auto_1fr] gap-4">
            <div className="mx-auto h-44 w-full max-w-52">
              <ChartContainer
                config={{ value: { label: 'Đơn hàng', color: 'var(--chart-2)' } }}
                className="h-44 w-full"
              >
                <PieChart>
                  <Pie
                    data={statusSegments}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={82}
                  >
                    {statusSegments.map((segment, index) => (
                      <Cell key={segment.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-white text-foreground shadow-xl dark:bg-zinc-900"
                        hideLabel
                        formatter={(value, name, item) =>
                          renderOrderStatusTooltip(value, String(name), item as never)
                        }
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Tổng đơn:{' '}
              <span className="font-semibold text-foreground">
                {orderStatusQuery.data?.totalOrders.toLocaleString('vi-VN') ?? 0}
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 text-sm">
              {statusSegments.map((segment, index) => (
                <div key={segment.status} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span>{segment.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {segment.value.toLocaleString('vi-VN')} ({segment.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
        <Card className="flex h-full min-h-[440px] flex-col">
          <CardHeader>
            <CardTitle>Doanh thu theo danh mục</CardTitle>
          </CardHeader>
          <CardContent className="grid flex-1 grid-rows-[auto_1fr] gap-4">
            <div className="mx-auto h-52 w-full max-w-60">
              <ChartContainer
                config={{ value: { label: 'Doanh thu', color: 'var(--chart-3)' } }}
                className="h-52 w-full"
              >
                <PieChart>
                  <Pie
                    data={categorySegments}
                    dataKey="revenue"
                    nameKey="categoryName"
                    innerRadius={52}
                    outerRadius={82}
                  >
                    {categorySegments.map((segment, index) => (
                      <Cell key={segment.categoryId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-white text-foreground shadow-xl dark:bg-zinc-900"
                        formatter={(value, name, item) =>
                          renderCategoryRevenueTooltip(value, String(name), item as never)
                        }
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 text-sm">
              {categorySegments.map((segment, index) => (
                <div key={segment.categoryId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span>{segment.categoryName}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {segment.percentage}% ({formatCompactVnd(segment.revenue)})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Đơn hàng mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="overflow-y-auto">
              <Table>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order.orderCode}
                      className="border-b border-border/40 hover:bg-muted/30"
                    >
                      <TableCell className="px-2 py-2.5 text-sm font-semibold">
                        #{order.orderCode}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-sm text-muted-foreground">
                        {order.customerName}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-xs text-muted-foreground tabular-nums">
                        {shortDateFormatter.format(new Date(order.createdAt))}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-right text-sm font-medium tabular-nums">
                        {formatVnd(order.totalAmount)}
                      </TableCell>
                      <TableCell className="px-2 py-2.5">
                        <Badge
                          variant="secondary"
                          className={cn(getDashboardOrderStatusClassName(order.status))}
                        >
                          {getDashboardOrderStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              variant="link"
              className="mt-auto self-start px-0 text-sky-700 hover:text-sky-800"
              asChild
            >
              <Link href="/orders" className="inline-flex items-center gap-1">
                Xem tất cả
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="space-y-1 overflow-y-auto">
              {topProducts.map((item, index) => (
                <ProductListItem
                  key={item.productId}
                  leading={
                    <span
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold',
                        getTopRankClassName(index),
                      )}
                    >
                      {index + 1}
                    </span>
                  }
                  thumbnailUrl={item.thumbnailUrl}
                  title={item.productName}
                  tooltipTitle={item.productName}
                  subtitle={`Đã bán: ${item.soldQuantity.toLocaleString('vi-VN')}`}
                  trailing={
                    <span className="text-sm font-medium tabular-nums">
                      {formatVnd(item.revenue)}
                    </span>
                  }
                />
              ))}
            </div>
            <Button
              variant="link"
              className="mt-auto self-start px-0 text-sky-700 hover:text-sky-800"
              asChild
            >
              <Link href="/inventory" className="inline-flex items-center gap-1">
                Xem tất cả
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Tồn kho sắp hết</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="space-y-2 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có sản phẩm dưới ngưỡng tồn kho hiện tại.
                </p>
              ) : (
                lowStockItems.map((item, index) => (
                  <ProductListItem
                    key={item.productId}
                    leading={<span className="text-xs">{index + 1}</span>}
                    thumbnailUrl={item.thumbnailUrl}
                    title={`${item.productName} (${item.colorName ?? 'N/A'}/${item.sizeLabel ?? 'N/A'})`}
                    tooltipTitle={`${item.productName} (${item.colorName ?? 'N/A'}/${item.sizeLabel ?? 'N/A'})`}
                    subtitle={`Số lượng: ${item.stock}`}
                    trailing={
                      <Badge
                        variant="secondary"
                        className={cn(
                          item.statusLabel === 'out_of_stock'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                            : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200',
                        )}
                      >
                        {item.statusLabel === 'out_of_stock' ? 'Hết hàng' : 'Sắp hết'}
                      </Badge>
                    }
                  />
                ))
              )}
            </div>
            <Button
              variant="link"
              className="mt-auto self-start px-0 text-sky-700 hover:text-sky-800"
              asChild
            >
              <Link href="/products" className="inline-flex items-center gap-1">
                Xem tất cả
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
