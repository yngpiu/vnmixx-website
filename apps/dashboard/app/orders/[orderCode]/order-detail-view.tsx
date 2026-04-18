'use client';

import { OrderActionsDialog } from '@/components/orders/order-actions-dialog';
import { PageViewHeader } from '@/components/page-view-header';
import { adminModulePath } from '@/lib/admin-modules';
import { getAdminOrder } from '@/lib/api/orders';
import { formatVnd } from '@/lib/format-vnd';
import {
  getOrderStatusBadgeClassName,
  getOrderStatusLabel,
  getPaymentStatusBadgeClassName,
  getPaymentStatusLabel,
} from '@/lib/order-status-labels';
import type { OrderAdminDetail } from '@/lib/types/order-admin';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { Separator } from '@repo/ui/components/ui/separator';
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
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

function parseOrderCodeParam(raw: string | string[] | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    return null;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function paymentMethodLabel(method: string): string {
  if (method === 'COD') return 'COD';
  if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
  return method;
}

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function OrderDetailView() {
  const params = useParams();
  const orderCode = parseOrderCodeParam(params.orderCode);
  const [actionsOpen, setActionsOpen] = useState(false);
  if (orderCode === null) {
    notFound();
  }
  const detailQuery = useQuery({
    queryKey: ['orders', 'admin', 'detail', orderCode],
    queryFn: () => getAdminOrder(orderCode),
  });
  const timeline = useMemo(() => {
    const list = detailQuery.data?.statusHistories ?? [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [detailQuery.data?.statusHistories]);
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin" />
        Đang tải đơn hàng…
      </div>
    );
  }
  if (detailQuery.isError) {
    const status = isAxiosError(detailQuery.error) ? detailQuery.error.response?.status : undefined;
    if (status === 404) {
      notFound();
    }
    const msg =
      detailQuery.error instanceof Error ? detailQuery.error.message : 'Không tải được đơn hàng.';
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {msg}
      </div>
    );
  }
  const order: OrderAdminDetail = detailQuery.data!;
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 px-0 text-muted-foreground"
          asChild
        >
          <Link href={adminModulePath('orders')}>
            <ArrowLeftIcon className="size-4" />
            Danh sách đơn hàng
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageViewHeader
            title={order.orderCode}
            description={`Tạo ${dateTimeFormatter.format(new Date(order.createdAt))} · Cập nhật ${dateTimeFormatter.format(new Date(order.updatedAt))}`}
          />
          <Button type="button" onClick={() => setActionsOpen(true)}>
            Thao tác nghiệp vụ
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="secondary"
          className={cn('text-sm', getOrderStatusBadgeClassName(order.status))}
        >
          Đơn: {getOrderStatusLabel(order.status)}
        </Badge>
        <Badge
          variant="secondary"
          className={cn('text-sm', getPaymentStatusBadgeClassName(order.paymentStatus))}
        >
          Thanh toán: {getPaymentStatusLabel(order.paymentStatus)}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tổng quan thanh toán</CardTitle>
            <CardDescription>Tiền hàng, ship, giảm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="tabular-nums font-medium">{formatVnd(order.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Giảm giá</span>
              <span className="tabular-nums">{formatVnd(order.discountAmount)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Phí vận chuyển</span>
              <span className="tabular-nums">{formatVnd(order.shippingFee)}</span>
            </div>
            {order.couponCode ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Mã giảm</span>
                <span className="font-mono text-xs">{order.couponCode}</span>
              </div>
            ) : null}
            <Separator className="my-2" />
            <div className="flex justify-between gap-2 text-base">
              <span className="font-medium">Tổng cộng</span>
              <span className="tabular-nums font-semibold">{formatVnd(order.total)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Khách hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.customer.fullName}</p>
            <p className="text-muted-foreground">{order.customer.email}</p>
            <p className="tabular-nums text-muted-foreground">{order.customer.phoneNumber}</p>
            <p className="text-xs text-muted-foreground">Mã KH: {order.customerId}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Giao hàng &amp; GHN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{order.shippingFullName}</span>{' '}
              <span className="tabular-nums text-muted-foreground">
                {order.shippingPhoneNumber}
              </span>
            </p>
            <p className="text-muted-foreground">
              {order.shippingAddressLine}, {order.shippingWard}, {order.shippingDistrict},{' '}
              {order.shippingCity}
            </p>
            <p className="text-xs text-muted-foreground">Ghi chú giao: {order.requiredNote}</p>
            {order.note ? <p className="text-xs">Ghi chú đơn: {order.note}</p> : null}
            {order.ghnOrderCode ? (
              <p className="font-mono text-xs">
                Mã vận đơn GHN: <span className="font-medium">{order.ghnOrderCode}</span>
              </p>
            ) : null}
            {order.expectedDeliveryTime ? (
              <p className="text-xs text-muted-foreground">
                Dự kiến giao: {dateTimeFormatter.format(new Date(order.expectedDeliveryTime))}
              </p>
            ) : null}
            {order.serviceTypeId != null ? (
              <p className="text-xs text-muted-foreground">
                Dịch vụ GHN (service_type_id): {order.serviceTypeId}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-end">Đơn giá</TableHead>
                  <TableHead className="text-end">SL</TableHead>
                  <TableHead className="text-end">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="max-w-xs font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.colorName} · {item.sizeLabel}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatVnd(item.price)}</TableCell>
                    <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-end tabular-nums font-medium">
                      {formatVnd(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-end">Số tiền</TableHead>
                  <TableHead>Mã giao dịch</TableHead>
                  <TableHead>Thanh toán lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{paymentMethodLabel(p.method)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getPaymentStatusBadgeClassName(p.status)}
                      >
                        {getPaymentStatusLabel(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{formatVnd(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.transactionId ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.paidAt ? dateTimeFormatter.format(new Date(p.paidAt)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử trạng thái</CardTitle>
          <CardDescription>Thời điểm ghi nhận theo hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4 border-s border-border ps-4">
            {timeline.map((h) => (
              <li key={h.id} className="relative -translate-x-px ps-2">
                <span className="absolute start-[-5px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">{getOrderStatusLabel(h.status)}</p>
                <p className="text-xs text-muted-foreground">
                  {dateTimeFormatter.format(new Date(h.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <OrderActionsDialog
        orderCode={order.orderCode}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={`Thao tác · ${order.orderCode}`}
        onAfterMutation={() => {
          void detailQuery.refetch();
        }}
      />
    </div>
  );
}
