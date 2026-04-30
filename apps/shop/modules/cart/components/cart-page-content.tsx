'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useCartQuery, useRemoveCartItemMutation } from '@/modules/cart/hooks/use-cart';
import { useDebouncedCartQuantityUpdate } from '@/modules/cart/hooks/use-debounced-cart-quantity';
import type { CartItem } from '@/modules/cart/types/cart';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { Button } from '@repo/ui/components/ui/button';
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const CHECKOUT_STEPS = ['Giỏ hàng', 'Đặt hàng', 'Thanh toán', 'Hoàn thành đơn'] as const;

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

function getItemTotal(item: CartItem): number {
  return item.variant.price * item.quantity;
}

function CartProgressSteps(): React.JSX.Element {
  return (
    <div className="border border-border px-6 py-8">
      <div className="px-3">
        <div className="relative grid grid-cols-4 items-start text-center">
          <span
            className="absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-border"
            aria-hidden
          />
          {CHECKOUT_STEPS.map((step, index) => (
            <div key={step} className="relative z-10 flex flex-col items-center gap-3">
              <span
                className={`size-3 rounded-full border ${index === 0 ? 'border-foreground bg-foreground' : 'border-border bg-background'}`}
                aria-hidden
              />
              <span className="text-[13px] leading-5 text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartTableHeader(): React.JSX.Element {
  return (
    <header className="grid grid-cols-[1fr_130px_130px_36px] items-center border-b border-border pb-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      <span>Tên sản phẩm</span>
      <span className="text-center">Số lượng</span>
      <span className="text-right">Tổng tiền</span>
      <span aria-hidden />
    </header>
  );
}

function CartTableRow({
  item,
  isUpdating,
  scheduleQuantityUpdate,
  removeItem,
}: {
  item: CartItem;
  isUpdating: boolean;
  scheduleQuantityUpdate: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
}): React.JSX.Element {
  return (
    <article className="grid grid-cols-[1fr_130px_130px_36px] items-start gap-3 border-b border-border py-4">
      <div className="grid grid-cols-[76px_1fr] gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.variant.product.thumbnail ?? '/images/placeholder.jpg'}
          alt={item.variant.product.name}
          className="h-[104px] w-[76px] object-cover"
        />
        <div className="pt-0.5">
          <h2 className="text-[16px] leading-6 text-foreground">{item.variant.product.name}</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            Màu sắc: {item.variant.color.name}
            <span className="ml-4">Size: {item.variant.size.label}</span>
          </p>
        </div>
      </div>
      <div className="flex justify-center self-center">
        <div className="flex items-center rounded-md border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-none text-muted-foreground"
            onClick={() => {
              scheduleQuantityUpdate(item.id, item.quantity - 1);
            }}
            aria-label="Giảm số lượng"
            disabled={isUpdating}
          >
            <MinusIcon className="size-4" />
          </Button>
          <span className="min-w-8 text-center text-sm">{item.quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-none text-muted-foreground"
            onClick={() => scheduleQuantityUpdate(item.id, item.quantity + 1)}
            aria-label="Tăng số lượng"
            disabled={isUpdating}
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="self-center text-right">
        <p className="text-[18px] font-semibold leading-none text-foreground">
          {formatMoney(getItemTotal(item))}
        </p>
      </div>
      <div className="flex items-center justify-center self-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => removeItem(item.id)}
          disabled={isUpdating}
          aria-label="Xóa sản phẩm"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </article>
  );
}

function CartSummaryPanel({
  totalQuantity,
  totalPrice,
}: {
  totalQuantity: number;
  totalPrice: number;
}): React.JSX.Element {
  return (
    <aside className="h-fit border border-border p-4">
      <h3 className="text-[24px] leading-none font-semibold text-foreground">Tổng tiền giỏ hàng</h3>
      <div className="mt-5 space-y-4 border-b border-border pb-5 text-[16px] leading-none">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tổng sản phẩm</span>
          <span className="text-foreground">{totalQuantity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tổng tiền hàng</span>
          <span className="text-foreground">{formatMoney(totalPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Thành tiền</span>
          <span className="font-semibold text-foreground">{formatMoney(totalPrice)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-semibold text-foreground">{formatMoney(totalPrice)}</span>
        </div>
      </div>
      <PrimaryCtaButton className="mt-5" type="button">
        ĐẶT HÀNG
      </PrimaryCtaButton>
    </aside>
  );
}

export function CartPageContent(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const cartQuery = useCartQuery({ enabled: Boolean(user) });
  const { scheduleQuantityUpdate, isSavingQuantity } = useDebouncedCartQuantityUpdate();
  const removeCartItemMutation = useRemoveCartItemMutation();
  const items = cartQuery.data?.items ?? [];
  const totalPrice = items.reduce((total, item) => total + getItemTotal(item), 0);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const isUpdating = isSavingQuantity || removeCartItemMutation.isPending;
  if (!isAuthSessionReady) {
    return (
      <main className="shop-shell-container py-8 md:py-10">
        <h1 className="mb-6 text-2xl font-semibold">Giỏ hàng</h1>
      </main>
    );
  }
  if (user === null) {
    return (
      <main className="shop-shell-container py-8 md:py-10">
        <h1 className="mb-6 text-2xl font-semibold">Giỏ hàng</h1>
        <p className="text-sm text-muted-foreground">Vui lòng đăng nhập để xem giỏ hàng.</p>
      </main>
    );
  }
  if (cartQuery.isLoading) {
    return (
      <main className="shop-shell-container py-8 md:py-10">
        <h1 className="mb-6 text-2xl font-semibold">Giỏ hàng</h1>
        <p className="text-sm text-muted-foreground">Đang tải giỏ hàng...</p>
      </main>
    );
  }
  if (cartQuery.isError) {
    return (
      <main className="shop-shell-container py-8 md:py-10">
        <h1 className="mb-6 text-2xl font-semibold">Giỏ hàng</h1>
        <p className="text-sm text-destructive" role="alert">
          {cartQuery.error instanceof Error ? cartQuery.error.message : 'Không tải được giỏ hàng.'}
        </p>
      </main>
    );
  }
  return (
    <main className="shop-shell-container py-8">
      {items.length === 0 ? (
        <section className="rounded-lg border border-dashed p-10 text-center">
          <ShoppingBagIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Giỏ hàng của bạn đang trống.</p>
          <PrimaryCtaButton asChild>
            <Link href="/">Tiếp tục mua sắm</Link>
          </PrimaryCtaButton>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <CartProgressSteps />
            <div>
              <h1 className="mb-5 text-[24px] leading-none font-semibold text-foreground">
                Giỏ hàng của bạn <span className="text-rose-700">{totalQuantity} Sản Phẩm</span>
              </h1>
              <CartTableHeader />
              <div>
                {items.map((item) => (
                  <CartTableRow
                    key={item.id}
                    item={item}
                    isUpdating={isUpdating}
                    scheduleQuantityUpdate={scheduleQuantityUpdate}
                    removeItem={(itemId: number) => removeCartItemMutation.mutate(itemId)}
                  />
                ))}
              </div>
              <div className="pt-5">
                <PrimaryCtaButton ctaVariant="outline" asChild className="w-auto!">
                  <Link href="/">← Tiếp tục mua hàng</Link>
                </PrimaryCtaButton>
              </div>
            </div>
          </div>
          <CartSummaryPanel totalPrice={totalPrice} totalQuantity={totalQuantity} />
        </section>
      )}
    </main>
  );
}
