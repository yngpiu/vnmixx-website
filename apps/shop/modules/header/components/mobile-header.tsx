'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useCartQuery } from '@/modules/cart/hooks/use-cart';
import { useGuestCart } from '@/modules/cart/hooks/use-guest-cart';
import { useCartStore } from '@/modules/cart/stores/cart-store';
import { useHeaderUiStore } from '@/modules/header/stores/header-ui-store';
import { Button } from '@repo/ui/components/ui/button';
import { MenuIcon, ShoppingBagIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function MobileHeader(): React.JSX.Element {
  const openMobileDrawer = useHeaderUiStore((state) => state.openMobileDrawer);
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const openCartDrawer = useCartStore((state) => state.openDrawer);
  const cartQuery = useCartQuery({ enabled: Boolean(isAuthSessionReady && user) });
  const { totalQuantity: guestTotalQuantity } = useGuestCart();
  const serverTotalQuantity = (cartQuery.data?.items ?? []).reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const totalQuantity = user ? serverTotalQuantity : guestTotalQuantity;
  return (
    <div className="shop-shell-container flex h-14 items-center justify-between border-b md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground size-9 -ml-2.5 rounded-full"
        onClick={openMobileDrawer}
        aria-label="Mở menu"
      >
        <MenuIcon className="size-5 stroke-[1.75]" />
      </Button>
      <Link href="/" aria-label="Trang chủ" className="relative block h-[31px] w-[108px]">
        <Image
          src="/images/logo.png"
          alt="IVY moda"
          fill
          sizes="108px"
          priority
          className="object-contain"
        />
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground relative size-9 -mr-2.5 rounded-full"
        onClick={openCartDrawer}
        aria-label="Giỏ hàng"
      >
        <ShoppingBagIcon className="size-5 stroke-[1.75]" />
        <span className="absolute top-1 right-1 flex size-3 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
          {totalQuantity}
        </span>
      </Button>
    </div>
  );
}
