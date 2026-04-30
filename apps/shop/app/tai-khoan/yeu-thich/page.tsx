'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { NewArrivalProductItem } from '@/modules/home/components/new-arrival-product-item';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { useMyWishlistQuery } from '@/modules/wishlist/hooks/use-wishlist';
import type { WishlistItem } from '@/modules/wishlist/types/wishlist';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function mapWishlistItemToNewArrivalProduct(item: WishlistItem): NewArrivalProduct {
  const prices = item.product.variants.map((variant) => variant.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  return {
    id: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    thumbnail: item.product.thumbnail,
    minPrice,
    maxPrice,
    colorHexCodes: [],
    category: null,
  };
}

function WishlistBreadcrumb(): React.JSX.Element {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[14px] leading-6 text-muted-foreground">
      <Link href="/" className="transition hover:text-foreground">
        Trang chủ
      </Link>
      <span aria-hidden className="text-muted-foreground/80">
        –
      </span>
      <Link href="/tai-khoan" className="transition hover:text-foreground">
        Tài khoản
      </Link>
      <span aria-hidden className="text-muted-foreground/80">
        –
      </span>
      <span className="font-medium text-foreground">Sản phẩm yêu thích</span>
    </nav>
  );
}

function AccountNavAside(): React.JSX.Element {
  const pathname = usePathname();
  return (
    <aside className="self-start border border-border rounded-tl-[20px] rounded-tr-none rounded-bl-none rounded-br-[20px] p-4">
      <div className="mb-3 border-b border-border pb-3 text-[20px] font-semibold text-foreground">
        Tài khoản
      </div>
      <ul className="space-y-0.5">
        {ACCOUNT_MENU_ITEMS.map((item) => {
          const ItemIcon = item.icon;
          const isActive = pathname === item.href;
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
  );
}

export default function AccountWishlistPage(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const isCustomer = Boolean(isAuthSessionReady && user);
  const wishlistQuery = useMyWishlistQuery({ enabled: isCustomer });
  if (!isAuthSessionReady) {
    return (
      <main className="shop-shell-container pb-16 pt-6 md:pt-8">
        <WishlistBreadcrumb />
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="shop-shell-container pb-16 pt-6 md:pt-8">
        <WishlistBreadcrumb />
        <section className="grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
          <AccountNavAside />
          <div>
            <h1 className="mb-6 text-xl font-semibold tracking-wide uppercase text-foreground md:text-2xl">
              Sản phẩm yêu thích
            </h1>
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-md border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
              <p>Bạn cần đăng nhập để xem danh sách sản phẩm yêu thích.</p>
              <PrimaryCtaButton
                type="button"
                className="w-auto min-w-[160px]"
                onClick={() => router.push('/login')}
              >
                Đăng nhập
              </PrimaryCtaButton>
            </div>
          </div>
        </section>
      </main>
    );
  }
  if (wishlistQuery.isLoading) {
    return (
      <main className="shop-shell-container pb-16 pt-6 md:pt-8">
        <WishlistBreadcrumb />
        <section className="grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
          <AccountNavAside />
          <div>
            <h1 className="mb-6 text-xl font-semibold tracking-wide uppercase text-foreground md:text-2xl">
              Sản phẩm yêu thích
            </h1>
            <p className="text-sm text-muted-foreground">Đang tải danh sách yêu thích...</p>
          </div>
        </section>
      </main>
    );
  }
  if (wishlistQuery.isError) {
    return (
      <main className="shop-shell-container pb-16 pt-6 md:pt-8">
        <WishlistBreadcrumb />
        <section className="grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
          <AccountNavAside />
          <div>
            <h1 className="mb-6 text-xl font-semibold tracking-wide uppercase text-foreground md:text-2xl">
              Sản phẩm yêu thích
            </h1>
            <p className="text-sm text-destructive" role="alert">
              {wishlistQuery.error instanceof Error
                ? wishlistQuery.error.message
                : 'Không tải được danh sách yêu thích.'}
            </p>
          </div>
        </section>
      </main>
    );
  }
  const items = wishlistQuery.data ?? [];
  return (
    <main className="shop-shell-container pb-16 pt-6 md:pt-8">
      <WishlistBreadcrumb />
      <section className="grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
        <AccountNavAside />
        <div>
          <h1 className="mb-6 text-xl font-semibold tracking-wide uppercase text-foreground md:text-2xl">
            Sản phẩm yêu thích
          </h1>
          {items.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
              <p>Bạn chưa có sản phẩm yêu thích nào.</p>
              <Link
                href="/"
                className="text-foreground underline underline-offset-4 hover:no-underline"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) => (
                <NewArrivalProductItem
                  key={item.product.id}
                  product={mapWishlistItemToNewArrivalProduct(item)}
                  display="listing"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
