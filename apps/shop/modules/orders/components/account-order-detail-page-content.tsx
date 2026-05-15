'use client';

import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { getMyOrderDetail } from '@/modules/orders/api/orders';
import { getMyOrderStatusLabel } from '@/modules/orders/utils/order-status';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AccountOrderDetailPageContentProps = {
  orderCode: string;
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)} đ`;
}

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return dateFormatter.format(parsedDate);
}

export function AccountOrderDetailPageContent({
  orderCode,
}: AccountOrderDetailPageContentProps): React.JSX.Element {
  const pathname = usePathname();
  const orderDetailQuery = useQuery({
    queryKey: ['shop', 'me', 'order', orderCode],
    queryFn: () => getMyOrderDetail(orderCode),
  });
  const selectedOrder = orderDetailQuery.data;
  const firstPayment = selectedOrder?.payments[0];
  const paymentMethodLabel =
    firstPayment?.method === 'BANK_TRANSFER_QR'
      ? 'Chuyển khoản QR'
      : 'Thanh toán khi nhận hàng (COD)';
  return (
    <main className="shop-shell-container pb-16 pt-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <Link href="/me/profile" className="hover:text-foreground">
          Tài khoản
        </Link>
        <span className="mx-2">/</span>
        <Link href="/me/order" className="hover:text-foreground">
          Quản lý đơn hàng
        </Link>
        <span className="mx-2">/</span>
        <span>Chi tiết đơn hàng</span>
      </nav>
      <section className="mt-8 grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
        <aside className="radius-diagonal-lg self-start border border-border p-4">
          <div className="mb-3 border-b border-border pb-3 text-[20px] font-semibold text-foreground">
            Tài khoản
          </div>
          <ul className="space-y-0.5">
            {ACCOUNT_MENU_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isOrderRoute = item.href === '/me/order';
              const isActive = isOrderRoute
                ? pathname.startsWith(item.href)
                : pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground',
                      isActive ? 'bg-muted text-foreground font-semibold' : undefined,
                    )}
                  >
                    <ItemIcon className="size-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
        <div>
          {orderDetailQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải chi tiết đơn hàng...</p>
          ) : orderDetailQuery.isError || !selectedOrder ? (
            <p className="text-sm text-destructive" role="alert">
              {orderDetailQuery.error instanceof Error
                ? orderDetailQuery.error.message
                : 'Không tải được chi tiết đơn hàng.'}
            </p>
          ) : (
            <div className="space-y-6">
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
                <div className="flex items-center gap-2">
                  <Link
                    href="/me/order"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeftIcon className="size-5 stroke-[1.75]" />
                  </Link>
                  <h1 className="text-[24px] leading-8 font-semibold uppercase text-foreground">
                    Chi tiết đơn hàng{' '}
                    <span className="text-destructive">{selectedOrder.orderCode}</span>
                  </h1>
                </div>
                <p className="text-[13px] text-[#d56f6f]">
                  {getMyOrderStatusLabel(selectedOrder.status)}
                </p>
              </div>
              <section className="rounded-md border border-border bg-white px-4 py-3">
                <h2 className="text-[15px] font-semibold text-foreground">Trạng thái đơn hàng</h2>
                <ol className="mt-3 space-y-3">
                  {[...selectedOrder.statusHistories]
                    .sort(
                      (left, right) =>
                        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                    )
                    .map((history) => (
                      <li key={history.id} className="flex items-start gap-3">
                        <span className="mt-2 size-2 rounded-full bg-foreground" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground">
                            {getMyOrderStatusLabel(history.status)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(history.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              </section>
              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
                <div className="space-y-5">
                  {selectedOrder.items.map((item) => (
                    <article key={item.id} className="border-b border-border pb-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                          <div className="relative h-[160px] w-[160px] shrink-0 overflow-hidden bg-muted">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Không có ảnh
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/products/${encodeURIComponent(item.productSlug)}`}
                              className="text-[15px] leading-6 font-semibold text-foreground underline-offset-2 hover:underline"
                            >
                              {item.productName}
                            </Link>
                            <p className="text-[13px] leading-6 text-muted-foreground">
                              Màu sắc: {item.colorName}
                            </p>
                            <p className="text-[13px] leading-6 text-muted-foreground">
                              Size: {item.sizeLabel}
                            </p>
                            <p className="text-[13px] leading-6 text-muted-foreground">
                              Số lượng: {item.quantity}
                            </p>
                            <p className="text-[13px] leading-6 text-muted-foreground">
                              SKU:
                              <br />
                              (#{item.sku})
                            </p>
                          </div>
                        </div>
                        <p className="text-[18px] leading-7 font-semibold text-foreground">
                          {formatMoney(item.subtotal)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                <aside className="bg-muted/45 p-6">
                  <div className="space-y-3">
                    <h3 className="text-[16px] leading-6 font-semibold text-foreground">
                      Tóm tắt đơn hàng
                    </h3>
                    <p className="flex items-center justify-between text-[14px] text-muted-foreground">
                      <span>Ngày tạo đơn</span>
                      <span>{formatDateTime(selectedOrder.createdAt)}</span>
                    </p>
                    <p className="flex items-center justify-between text-[14px] text-muted-foreground">
                      <span>Tạm tính</span>
                      <span>{formatMoney(selectedOrder.subtotal)}</span>
                    </p>
                    <p className="flex items-center justify-between text-[14px] text-muted-foreground">
                      <span>Phí vận chuyển</span>
                      <span>{formatMoney(selectedOrder.shippingFee)}</span>
                    </p>
                    <p className="flex items-center justify-between text-[14px] font-semibold text-foreground">
                      <span>Tổng tiền</span>
                      <span>{formatMoney(selectedOrder.total)}</span>
                    </p>
                  </div>
                  <div className="mt-5 space-y-2 border-t border-border pt-5">
                    <h3 className="text-[15px] leading-6 font-semibold text-foreground">
                      Hình thức thanh toán
                    </h3>
                    <p className="text-[14px] text-muted-foreground">{paymentMethodLabel}</p>
                  </div>
                  <div className="mt-5 space-y-2 border-t border-border pt-5">
                    <h3 className="text-[15px] leading-6 font-semibold text-foreground">
                      Đơn vị vận chuyển
                    </h3>
                    <p className="text-[14px] text-muted-foreground">Chuyển phát nhanh</p>
                  </div>
                  <div className="mt-5 space-y-2 border-t border-border pt-5">
                    <h3 className="text-[15px] leading-6 font-semibold text-foreground">Địa chỉ</h3>
                    <p className="text-[14px] text-muted-foreground">
                      {selectedOrder.shippingFullName}
                    </p>
                    <p className="text-[14px] text-muted-foreground">
                      {[
                        selectedOrder.shippingAddressLine,
                        selectedOrder.shippingWard,
                        selectedOrder.shippingDistrict,
                        selectedOrder.shippingCity,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-[14px] text-muted-foreground">
                      Điện thoại: {selectedOrder.shippingPhoneNumber}
                    </p>
                  </div>
                </aside>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
