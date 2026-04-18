'use client';

import { getInclusiveUtcDateRange } from '@/lib/analytics-range';
import {
  getAnalyticsOverview,
  getAnalyticsTimeseries,
  getAnalyticsTopShippingCities,
} from '@/lib/api/analytics';
import { formatVnd } from '@/lib/format-vnd';
import { getOrderStatusLabel, getPaymentStatusLabel } from '@/lib/order-status-labels';
import type { OrderStatus, PaymentStatus } from '@/lib/types/order-admin';
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
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

const PRESETS = [7, 30, 90] as const;

const gmvAreaConfig = {
  gmv: { label: 'GMV', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const ordersBarConfig = {
  ordersCreated: { label: 'Đơn tạo', color: 'var(--chart-2)' },
  ordersCompleted: { label: 'Hoàn thành', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const methodPieConfig = {
  COD: { label: 'COD', color: 'var(--chart-1)' },
  BANK_TRANSFER: { label: 'Chuyển khoản', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const cityBarConfig = {
  gmv: { label: 'GMV', color: 'var(--chart-4)' },
} satisfies ChartConfig;

function methodLabel(method: string): string {
  if (method === 'COD') return 'COD';
  if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
  return method;
}

function kpiShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function AnalyticsDashboard() {
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
  const citiesQuery = useQuery({
    queryKey: ['analytics', 'top-cities', range],
    queryFn: () => getAnalyticsTopShippingCities({ ...range, limit: 8 }),
  });
  const tsData = useMemo(() => {
    const rows = timeseriesQuery.data?.data ?? [];
    return rows.map((row) => ({ ...row, label: row.bucketDate.slice(5) }));
  }, [timeseriesQuery.data?.data]);
  const methodPieData = useMemo(() => {
    return (overviewQuery.data?.paymentMethodMix ?? []).map((row) => ({
      method: row.method,
      name: methodLabel(row.method),
      orderCount: row.orderCount,
      fill: `var(--color-${row.method === 'COD' ? 'COD' : 'BANK_TRANSFER'})`,
    }));
  }, [overviewQuery.data?.paymentMethodMix]);
  const cityBarData = useMemo(() => {
    return (citiesQuery.data?.cities ?? []).map((c) => ({
      city: c.city.length > 16 ? `${c.city.slice(0, 14)}…` : c.city,
      gmv: c.gmv,
      orderCount: c.orderCount,
    }));
  }, [citiesQuery.data?.cities]);
  const statusRows = overviewQuery.data?.statusBreakdown ?? [];
  const paymentStatusRows = overviewQuery.data?.paymentStatusMix ?? [];
  const totalForPaymentShare = paymentStatusRows.reduce((s, r) => s + r.count, 0) || 1;
  if (overviewQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" />
        Đang tải phân tích…
      </div>
    );
  }
  if (overviewQuery.isError) {
    const msg = isAxiosError(overviewQuery.error)
      ? String(overviewQuery.error.response?.data ?? overviewQuery.error.message)
      : overviewQuery.error instanceof Error
        ? overviewQuery.error.message
        : 'Lỗi tải dữ liệu.';
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
        <strong>GMV</strong> tính trên đơn <em>tạo</em> trong kỳ (trừ hủy/hoàn).{' '}
        <strong>Hoàn thành</strong> dựa trên đơn{' '}
        <code className="rounded bg-muted px-1 text-xs">DELIVERED</code> và thời điểm cập nhật trong
        kỳ — gần với “giao xong trong kỳ” khi chưa có cột giao hàng riêng.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GMV</CardDescription>
            <CardTitle className="text-xl tabular-nums">{kpiShort(k.gmv)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{formatVnd(k.gmv)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đơn tạo</CardDescription>
            <CardTitle className="text-xl tabular-nums">{k.ordersCreatedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hoàn thành</CardDescription>
            <CardTitle className="text-xl tabular-nums">{k.ordersCompletedCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatVnd(k.completedRevenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chờ xử lý (tạo trong kỳ)</CardDescription>
            <CardTitle className="text-xl tabular-nums">{k.ordersPendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GMV theo ngày</CardTitle>
          <CardDescription>Đơn tạo trong ngày (trừ hủy/hoàn)</CardDescription>
        </CardHeader>
        <CardContent>
          {timeseriesQuery.isLoading ? (
            <div className="flex h-[240px] items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : timeseriesQuery.isError ? (
            <p className="text-sm text-destructive">Không tải được chuỗi thời gian.</p>
          ) : (
            <ChartContainer config={gmvAreaConfig} className="min-h-[240px] w-full">
              <AreaChart accessibilityLayer data={tsData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => kpiShort(Number(v))}
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
                  <linearGradient id="analyticsGmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-gmv)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-gmv)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="gmv"
                  type="monotone"
                  fill="url(#analyticsGmvFill)"
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
          <CardTitle className="text-base">Đơn tạo vs hoàn thành</CardTitle>
          <CardDescription>Theo bucket ngày (tạo / cập nhật)</CardDescription>
        </CardHeader>
        <CardContent>
          {timeseriesQuery.isLoading ? (
            <div className="flex h-[240px] items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChartContainer config={ordersBarConfig} className="min-h-[240px] w-full">
              <BarChart accessibilityLayer data={tsData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="ordersCreated" fill="var(--color-ordersCreated)" radius={4} />
                <Bar dataKey="ordersCompleted" fill="var(--color-ordersCompleted)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phương thức thanh toán</CardTitle>
            <CardDescription>Số đơn tạo trong kỳ</CardDescription>
          </CardHeader>
          <CardContent>
            {methodPieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Chưa có đơn trong kỳ.
              </p>
            ) : (
              <ChartContainer
                config={methodPieConfig}
                className="mx-auto aspect-square max-h-[280px] w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie
                    data={methodPieData}
                    dataKey="orderCount"
                    nameKey="name"
                    innerRadius={56}
                    strokeWidth={2}
                  >
                    {methodPieData.map((entry, index) => (
                      <Cell key={`cell-${entry.method}-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top thành phố giao</CardTitle>
            <CardDescription>GMV đơn tạo trong kỳ (trừ hủy/hoàn)</CardDescription>
          </CardHeader>
          <CardContent>
            {citiesQuery.isLoading ? (
              <div className="flex h-[240px] items-center justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : citiesQuery.isError ? (
              <p className="text-sm text-destructive">Không tải được top thành phố.</p>
            ) : cityBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              <ChartContainer config={cityBarConfig} className="min-h-[260px] w-full">
                <BarChart
                  accessibilityLayer
                  data={cityBarData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => kpiShort(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="city"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="gmv" fill="var(--color-gmv)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn theo trạng thái</CardTitle>
            <CardDescription>Tạo trong kỳ</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-end">Số đơn</TableHead>
                  <TableHead className="text-end">GMV nhóm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusRows.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell>{getOrderStatusLabel(row.status as OrderStatus)}</TableCell>
                    <TableCell className="text-end tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatVnd(row.gmv)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel thanh toán (đơn)</CardTitle>
            <CardDescription>Theo paymentStatus trên đơn trong kỳ</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-end">Số đơn</TableHead>
                  <TableHead className="text-end">Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentStatusRows.map((row) => (
                  <TableRow key={row.paymentStatus}>
                    <TableCell>
                      {getPaymentStatusLabel(row.paymentStatus as PaymentStatus)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {((100 * row.count) / totalForPaymentShare).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
