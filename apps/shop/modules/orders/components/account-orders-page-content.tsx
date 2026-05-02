'use client';

import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { getMyOrders } from '@/modules/orders/api/orders';
import type { MyOrderStatus } from '@/modules/orders/types/my-order';
import {
  MY_ORDER_STATUS_OPTIONS,
  getMyOrderStatusLabel,
} from '@/modules/orders/utils/order-status';
import { CatalogPaginationNav } from '@/modules/products/components/catalog-pagination-nav';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const PAGE_SIZE = 10;

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

function getOrderSummaryItem(orderCode: string, itemNames: string[]): string {
  if (itemNames.length === 0) {
    return `Đơn hàng ${orderCode}`;
  }
  const firstItemName = itemNames[0];
  if (!firstItemName) {
    return `Đơn hàng ${orderCode}`;
  }
  if (itemNames.length === 1) {
    return `1x ${firstItemName}`;
  }
  return `1x ${firstItemName} và ${itemNames.length - 1} sản phẩm khác`;
}

export function AccountOrdersPageContent(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const selectedStatus = searchParams.get('status') as MyOrderStatus | null;
  const ordersQuery = useQuery({
    queryKey: ['shop', 'me', 'orders', page, selectedStatus],
    queryFn: () =>
      getMyOrders({
        page,
        limit: PAGE_SIZE,
        ...(selectedStatus ? { status: selectedStatus } : {}),
      }),
  });
  const orders = ordersQuery.data?.data ?? [];
  const paginationMeta = ordersQuery.data?.meta;
  const updateSearch = (patch: Record<string, string | null>): void => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
        return;
      }
      nextParams.set(key, value);
    });
    const nextQuery = nextParams.toString();
    router.push(nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname);
  };
  const handleStatusChange = (statusValue: string): void => {
    updateSearch({
      status: statusValue.length > 0 ? statusValue : null,
      page: '1',
    });
  };
  const handleChangePage = (nextPage: number): void => {
    updateSearch({ page: String(nextPage) });
  };
  return (
    <main className="shop-shell-container pb-16 pt-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span className="mx-2">-</span>
        <span>Quản lý đơn hàng</span>
      </nav>
      <section className="mt-8 grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
        <aside className="radius-diagonal-lg self-start border border-border p-4">
          <div className="mb-3 border-b border-border pb-3 text-[20px] font-semibold text-foreground">
            Tài khoản
          </div>
          <ul className="space-y-0.5">
            {ACCOUNT_MENU_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isOrderRoute = item.href === '/tai-khoan/don-hang';
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[30px] leading-[40px] font-semibold uppercase text-foreground">
              Quản lý đơn hàng
            </h1>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Trạng thái đơn hàng:</span>
              <select
                value={selectedStatus ?? ''}
                className="h-10 min-w-[180px] rounded-sm border border-border bg-white px-3 text-sm text-foreground outline-none"
                onChange={(event) => handleStatusChange(event.target.value)}
              >
                <option value="">Tất cả</option>
                {MY_ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {ordersQuery.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Đang tải danh sách đơn hàng...</p>
          ) : ordersQuery.isError ? (
            <p className="mt-6 text-sm text-destructive" role="alert">
              {ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : 'Không thể tải danh sách đơn hàng.'}
            </p>
          ) : orders.length === 0 ? (
            <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-md border border-border bg-white px-4 text-sm text-muted-foreground">
              Bạn chưa có đơn hàng nào.
            </div>
          ) : (
            <>
              <div className="mt-6 overflow-hidden rounded-md border border-border bg-white">
                <div className="hidden grid-cols-[150px_170px_190px_1fr_130px] gap-4 border-b border-border px-5 py-3 text-[12px] font-semibold text-muted-foreground uppercase lg:grid">
                  <div>Mã đơn hàng</div>
                  <div>Ngày</div>
                  <div>Trạng thái</div>
                  <div>Sản phẩm</div>
                  <div className="text-right">Tổng tiền</div>
                </div>
                <div>
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="cursor-pointer border-b border-border px-5 py-4 transition-colors hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/tai-khoan/don-hang/${encodeURIComponent(order.orderCode)}`)
                      }
                      role="link"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') {
                          return;
                        }
                        event.preventDefault();
                        router.push(`/tai-khoan/don-hang/${encodeURIComponent(order.orderCode)}`);
                      }}
                    >
                      <div className="grid gap-2 lg:grid-cols-[150px_170px_190px_1fr_130px] lg:items-center">
                        <p className="text-[14px] leading-6 font-medium text-foreground underline underline-offset-2">
                          {order.orderCode}
                        </p>
                        <p className="text-[14px] leading-6 text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </p>
                        <p className="text-[14px] leading-6 text-muted-foreground">
                          {getMyOrderStatusLabel(order.status)}
                        </p>
                        <p className="text-[14px] leading-6 text-muted-foreground">
                          {getOrderSummaryItem(
                            order.orderCode,
                            order.items.map((item) => item.productName),
                          )}
                        </p>
                        <p className="text-[14px] leading-6 font-semibold text-foreground lg:text-right">
                          {formatMoney(order.total)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <CatalogPaginationNav
                page={paginationMeta?.page ?? 1}
                totalPages={paginationMeta?.totalPages ?? 1}
                onPageChange={handleChangePage}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
