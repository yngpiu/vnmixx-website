'use client';

import { useLogout } from '@/modules/auth/hooks/use-auth';
import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useCartQuery } from '@/modules/cart/hooks/use-cart';
import { useCartStore } from '@/modules/cart/stores/cart-store';
import {
  HeaderDropdownMenuContent,
  type HeaderDropdownMenuItem,
} from '@/modules/header/components/header-dropdown-menu-content';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { useSupportChatDrawerStore } from '@/modules/support-chat/stores/support-chat-drawer-store';
import { Button } from '@repo/ui/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger } from '@repo/ui/components/ui/dropdown-menu';
import { LogOutIcon, MessageCircleIcon, ShoppingBagIcon, UserRoundIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeaderActions(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const logoutMutation = useLogout();
  const openCartDrawer = useCartStore((state) => state.openDrawer);
  const openSupportChatDrawer = useSupportChatDrawerStore((state) => state.openDrawer);
  const cartQuery = useCartQuery({ enabled: Boolean(isAuthSessionReady && user) });
  const totalQuantity = (cartQuery.data?.items ?? []).reduce(
    (total, item) => total + item.quantity,
    0,
  );

  function navigateToLogin(): void {
    router.push('/login');
  }

  async function executeLogout(): Promise<void> {
    await logoutMutation.mutateAsync();
  }
  const accountMenuItems: HeaderDropdownMenuItem[] = [
    ...ACCOUNT_MENU_ITEMS.map((item) => ({
      label: item.label,
      icon: item.icon,
      href: item.href,
    })),
    {
      label: 'Đăng xuất',
      icon: LogOutIcon,
      onClick: () => void executeLogout(),
      disabled: logoutMutation.isPending,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-full"
            aria-label="Tài khoản"
            onClick={isAuthSessionReady ? (user ? undefined : navigateToLogin) : undefined}
          >
            <UserRoundIcon className="text-muted-foreground size-5 stroke-[1.75]" />
          </Button>
        </DropdownMenuTrigger>
        {isAuthSessionReady && user ? (
          <HeaderDropdownMenuContent title="Tài khoản của tôi" items={accountMenuItems} />
        ) : null}
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-9 rounded-full"
        aria-label="Liên hệ"
        onClick={openSupportChatDrawer}
      >
        <MessageCircleIcon className="text-muted-foreground size-5 stroke-[1.75]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative size-9 rounded-full"
        aria-label="Giỏ hàng"
        onClick={openCartDrawer}
      >
        <ShoppingBagIcon className="text-muted-foreground size-5 stroke-[1.75]" />
        <span className="absolute top-1 right-1 flex size-3 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
          {totalQuantity}
        </span>
      </Button>
    </div>
  );
}
