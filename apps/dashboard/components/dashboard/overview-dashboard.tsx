'use client';

import { getInclusiveUtcDateRange } from '@/lib/analytics-range';
import { getAnalyticsOverview, getAnalyticsTimeseries } from '@/lib/api/analytics';
import { formatVnd } from '@/lib/format-vnd';
import { getOrderStatusLabel } from '@/lib/order-status-labels';
import type { OrderStatus } from '@/lib/types/order-admin';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@repo/ui/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const PRESETS = [7, 30, 90] as const;

const gmvChartConfig = {
  gmv: {
    label: 'GMV (đơn tạo trong ngày)',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const statusChartConfig = {
  count: {
    label: 'Số đơn',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

function kpiLabel(gmv: number): string {
  if (gmv >= 1_000_000_000) return `${(gmv / 1_000_000_000).toFixed(1)} tỷ`;
  if (gmv >= 1_000_000) return `${(gmv / 1_000_000).toFixed(1)} tr`;
  if (gmv >= 1000) return `${(gmv / 1000).toFixed(0)} k`;
  return formatVnd(gmv);
}

export function OverviewDashboard() {
  const [days, setDays] = useState<number>(30);
  const range = useMemo(() => getInclusiveUtcDateRange(days), [days]);
  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: () => getAnalyticsOverview(range),
  });
  const timeseriesQuery = useQuery({
    queryKey: ['analytics', 'timeseries', range],
    queryFn: () => getAnalyticsTimeseries(range),
  });
  const gmvSeries = useMemo(() => {
    const rows = timeseriesQuery.data?.data ?? [];
    return rows.map((row) => ({
      ...row,
      label: row.bucketDate.slice(5),
    }));
  }, [timeseriesQuery.data?.data]);
  const statusBars = useMemo(() => {
    const rows = overviewQuery.data?.statusBreakdown ?? [];
    return rows.map((row) => ({
      status: getOrderStatusLabel(row.status as OrderStatus),
      count: row.count,
    }));
  }, [overviewQuery.data?.statusBreakdown]);
  if (overviewQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" />
        Đang tải tổng quan…
      </div>
    );
  }
  if (overviewQuery.isError) {
    const msg = isAxiosError(overviewQuery.error)
      ? String(overviewQuery.error.response?.data ?? overviewQuery.error.message)
      : overviewQuery.error instanceof Error
        ? overviewQuery.error.message
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
  const k = overviewQuery.data!.kpis;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Khoảng thời gian:</span>
        {PRESETS.map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={days === d ? 'default' : 'outline'}
            onClick={() => setDays(d)}
          >
            {d} ngày
          </Button>
        ))}
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        <strong>GMV trong kỳ</strong> ({days} ngày) là tổng giá trị đơn tạo trong kỳ (trừ hủy/hoàn).{' '}
        <strong>Hoàn thành</strong> là đơn giao xong (theo cập nhật trạng thái trong kỳ). Không thay
        thế kế toán thuần — đặc biệt với COD.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GMV · {days} ngày</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpiLabel(k.gmv)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{formatVnd(k.gmv)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đơn tạo · {days} ngày</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{k.ordersCreatedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chờ xử lý (tạo trong kỳ)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{k.ordersPendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang giao · tạo trong kỳ</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{k.ordersInTransitCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hoàn thành · {days} ngày</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{k.ordersCompletedCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Doanh thu hoàn thành: {formatVnd(k.completedRevenue)}
            {k.aovCompleted != null ? ` · AOV ${formatVnd(k.aovCompleted)}` : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hủy · {days} ngày</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{k.cancelledCount}</CardTitle>
          </CardHeader>
          {k.returnedCount > 0 ? (
            <CardContent className="text-xs text-muted-foreground">
              Hoàn: {k.returnedCount}
            </CardContent>
          ) : null}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GMV theo ngày</CardTitle>
            <CardDescription>{days} ngày đã chọn (đơn tạo theo ngày, trừ hủy/hoàn)</CardDescription>
          </CardHeader>
          <CardContent>
            {timeseriesQuery.isLoading ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
              </div>
            ) : timeseriesQuery.isError ? (
              <p className="text-sm text-destructive">Không tải được biểu đồ.</p>
            ) : (
              <ChartContainer config={gmvChartConfig} className="min-h-[220px] w-full">
                <AreaChart accessibilityLayer data={gmvSeries} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={56}
                    tickFormatter={(v) => kpiLabel(Number(v))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="tabular-nums">{formatVnd(Number(value))}</span>
                        )}
                      />
                    }
                  />
                  <defs>
                    <linearGradient id="overviewGmvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-gmv)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-gmv)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="gmv"
                    type="monotone"
                    fill="url(#overviewGmvFill)"
                    stroke="var(--color-gmv)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn theo trạng thái</CardTitle>
            <CardDescription>Đơn tạo trong {days} ngày đã chọn</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="min-h-[220px] w-full">
              <BarChart accessibilityLayer data={statusBars} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={72}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn cần xử lý</CardTitle>
          <CardDescription>
            PENDING hoặc chuyển khoản chưa xác nhận — mới nhất trước
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead className="text-end">Tổng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overviewQuery.data!.recentOrdersNeedingAction.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      Không có đơn cần xử lý.
                    </TableCell>
                  </TableRow>
                ) : (
                  overviewQuery.data!.recentOrdersNeedingAction.map((row) => (
                    <TableRow key={row.orderCode}>
                      <TableCell className="font-mono text-xs font-medium">
                        {row.orderCode}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {row.customerFullName}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatVnd(row.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {getOrderStatusLabel(row.status as OrderStatus)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/orders/${encodeURIComponent(row.orderCode)}`}>Mở</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
