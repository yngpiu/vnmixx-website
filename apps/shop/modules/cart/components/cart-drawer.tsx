'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useCartQuery } from '@/modules/cart/hooks/use-cart';
import { useDebouncedCartQuantityUpdate } from '@/modules/cart/hooks/use-debounced-cart-quantity';
import { useCartStore } from '@/modules/cart/stores/cart-store';
import type { CartItem } from '@/modules/cart/types/cart';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { Button } from '@repo/ui/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@repo/ui/components/ui/drawer';
import { MinusIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import Link from 'next/link';

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

function getItemTotal(item: CartItem): number {
  return item.variant.price * item.quantity;
}

function getCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + getItemTotal(item), 0);
}

function CartItemRow({
  item,
  isUpdating,
  scheduleQuantityUpdate,
  removeCartItemImmediately,
}: {
  item: CartItem;
  isUpdating: boolean;
  scheduleQuantityUpdate: (itemId: number, quantity: number) => void;
  removeCartItemImmediately: (itemId: number) => void;
}): React.JSX.Element {
  const handleDecreaseQuantity = (): void => {
    scheduleQuantityUpdate(item.id, item.quantity - 1);
  };
  const handleIncreaseQuantity = (): void => {
    scheduleQuantityUpdate(item.id, item.quantity + 1);
  };
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3 border-b border-border/70 pb-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.variant.product.thumbnail ?? '/images/placeholder.jpg'}
        alt={item.variant.product.name}
        className="h-[96px] w-[72px] rounded-sm object-cover"
      />
      <div className="space-y-2">
        <p className="line-clamp-2 text-[14px] leading-5 text-foreground">
          {item.variant.product.name}
        </p>
        <p className="text-[13px] leading-5 text-muted-foreground">
          Màu sắc: {item.variant.color.name}{' '}
          <span className="mx-2">Size: {item.variant.size.label}</span>
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center rounded-md border border-border">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 rounded-none text-muted-foreground"
              aria-label="Giảm số lượng"
              onClick={handleDecreaseQuantity}
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
              aria-label="Tăng số lượng"
              onClick={handleIncreaseQuantity}
              disabled={isUpdating}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-[14px] font-semibold leading-none text-rose-800">
              {formatMoney(getItemTotal(item))}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 shrink-0 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Xóa sản phẩm"
              onClick={() => removeCartItemImmediately(item.id)}
              disabled={isUpdating}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const cartQuery = useCartQuery({ enabled: Boolean(isAuthSessionReady && user) });
  const { scheduleQuantityUpdate, removeCartItemImmediately, isSavingQuantity } =
    useDebouncedCartQuantityUpdate();
  const items = cartQuery.data?.items ?? [];
  const isDrawerOpen = useCartStore((state) => state.isDrawerOpen);
  const setDrawerOpen = useCartStore((state) => state.setDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = getCartTotal(items);
  return (
    <Drawer direction="right" open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerContent className="h-svh rounded-none border-l bg-background p-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-none sm:data-[vaul-drawer-direction=right]:max-w-[420px]">
        <DrawerHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DrawerTitle className="text-[20px] font-semibold leading-none">Giỏ hàng</DrawerTitle>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background">
                {totalQuantity}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-9 rounded-full"
              aria-label="Đóng giỏ hàng"
              onClick={closeDrawer}
            >
              <XIcon className="size-6" />
            </Button>
          </div>
          <DrawerDescription className="sr-only">
            Chi tiết sản phẩm trong giỏ hàng
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {!isAuthSessionReady ? null : user === null ? (
              <p className="py-10 text-center text-base text-muted-foreground">
                Vui lòng đăng nhập để xem giỏ hàng.
              </p>
            ) : cartQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Đang tải giỏ hàng...
              </p>
            ) : cartQuery.isError ? (
              <p className="py-10 text-center text-sm text-destructive" role="alert">
                {cartQuery.error instanceof Error
                  ? cartQuery.error.message
                  : 'Không tải được giỏ hàng.'}
              </p>
            ) : items.length > 0 ? (
              items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  isUpdating={isSavingQuantity}
                  scheduleQuantityUpdate={scheduleQuantityUpdate}
                  removeCartItemImmediately={removeCartItemImmediately}
                />
              ))
            ) : (
              <p className="py-10 text-center text-base text-muted-foreground">
                Giỏ hàng đang trống.
              </p>
            )}
          </div>
          <div className="mt-auto border-t px-6 py-5">
            <div className="mb-4 flex items-center justify-end gap-2">
              <span className="text-[14px] text-muted-foreground">Tổng cộng:</span>
              <span className="text-[18px] font-semibold leading-none text-foreground">
                {formatMoney(cartTotal)}
              </span>
            </div>
            <PrimaryCtaButton asChild onClick={closeDrawer}>
              <Link href="/gio-hang" aria-label="Xem giỏ hàng">
                XEM GIỎ HÀNG
              </Link>
            </PrimaryCtaButton>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
