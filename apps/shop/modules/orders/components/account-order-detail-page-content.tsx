'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { getMyOrderDetail } from '@/modules/orders/api/orders';
import { getMyOrderStatusLabel } from '@/modules/orders/utils/order-status';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon } from 'lucide-react';
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
          <Link
            href="/me/order"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Quay lại danh sách đơn hàng
          </Link>
          <section className="radius-diagonal-lg mt-4 border border-border bg-white p-6">
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[28px] leading-[34px] font-semibold uppercase text-foreground">
                    Chi tiết đơn hàng {selectedOrder.orderCode}
                  </h1>
                  <p className="text-[14px] text-muted-foreground">
                    {getMyOrderStatusLabel(selectedOrder.status)}
                  </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <article
                        key={item.id}
                        className="flex items-start justify-between gap-4 border-b border-border pb-4"
                      >
                        <div>
                          <p className="text-[16px] leading-6 font-semibold text-foreground">
                            {item.productName}
                          </p>
                          <p className="text-[14px] leading-6 text-muted-foreground">
                            Màu sắc: {item.colorName}
                          </p>
                          <p className="text-[14px] leading-6 text-muted-foreground">
                            Size: {item.sizeLabel}
                          </p>
                          <p className="text-[14px] leading-6 text-muted-foreground">
                            Số lượng: {item.quantity}
                          </p>
                          <p className="text-[14px] leading-6 text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <p className="text-[24px] leading-8 font-semibold text-foreground">
                          {formatMoney(item.subtotal)}
                        </p>
                      </article>
                    ))}
                  </div>
                  <aside className="space-y-6 border border-border p-5">
                    <div className="space-y-2">
                      <h3 className="text-[20px] leading-6 font-semibold text-foreground">
                        Tóm tắt đơn hàng
                      </h3>
                      <p className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Ngày tạo đơn</span>
                        <span>{formatDateTime(selectedOrder.createdAt)}</span>
                      </p>
                      <p className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Tạm tính</span>
                        <span>{formatMoney(selectedOrder.subtotal)}</span>
                      </p>
                      <p className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Phí vận chuyển</span>
                        <span>{formatMoney(selectedOrder.shippingFee)}</span>
                      </p>
                      <p className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>Tổng tiền</span>
                        <span>{formatMoney(selectedOrder.total)}</span>
                      </p>
                    </div>
                    <div className="space-y-2 border-t border-border pt-4">
                      <h3 className="text-[18px] leading-6 font-semibold text-foreground">
                        Hình thức thanh toán
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.payments[0]?.method === 'BANK_TRANSFER_QR'
                          ? 'Thanh toán chuyển khoản'
                          : 'Thanh toán khi nhận hàng (COD)'}
                      </p>
                    </div>
                    <div className="space-y-2 border-t border-border pt-4">
                      <h3 className="text-[18px] leading-6 font-semibold text-foreground">
                        Địa chỉ
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.shippingFullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.shippingPhoneNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[
                          selectedOrder.shippingAddressLine,
                          selectedOrder.shippingWard,
                          selectedOrder.shippingDistrict,
                          selectedOrder.shippingCity,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </aside>
                </div>
                <div className="flex justify-start">
                  <PrimaryCtaButton className="w-auto min-w-[220px]" asChild>
                    <Link href="/me/order">QUAY LẠI DANH SÁCH</Link>
                  </PrimaryCtaButton>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
