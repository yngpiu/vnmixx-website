'use client';

import { useLogout } from '@/modules/auth/hooks/use-auth';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import {
  HeaderDropdownMenuContent,
  type HeaderDropdownMenuItem,
} from '@/modules/header/components/header-dropdown-menu-content';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { MOBILE_SUPPORT_MENU_ITEMS } from '@/modules/header/constants/mobile-support-menu-items';
import { Button } from '@repo/ui/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger } from '@repo/ui/components/ui/dropdown-menu';
import { HeadsetIcon, LogOutIcon, ShoppingBagIcon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const HEADER_ACTIONS = [{ label: 'Giỏ hàng', icon: ShoppingBagIcon, href: '/cart' }] as const;

export function HeaderActions(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  function navigateToLogin(): void {
    router.push('/login');
  }

  async function executeLogout(): Promise<void> {
    await logoutMutation.mutateAsync();
  }
  const supportMenuItems: HeaderDropdownMenuItem[] = MOBILE_SUPPORT_MENU_ITEMS.map((item) => ({
    label: item.label,
    icon: item.icon,
  }));
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
            onClick={user ? undefined : navigateToLogin}
          >
            <UserRoundIcon className="text-muted-foreground size-5 stroke-[1.75]" />
          </Button>
        </DropdownMenuTrigger>
        {user ? (
          <HeaderDropdownMenuContent title="Tài khoản của tôi" items={accountMenuItems} />
        ) : null}
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-full"
            aria-label="Trợ giúp"
          >
            <HeadsetIcon className="text-muted-foreground size-5 stroke-[1.75]" />
          </Button>
        </DropdownMenuTrigger>
        <HeaderDropdownMenuContent title="Trợ giúp" items={supportMenuItems} />
      </DropdownMenu>
      {HEADER_ACTIONS.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="icon-sm"
          className="size-9 rounded-full"
          asChild
        >
          <Link href={action.href} aria-label={action.label}>
            <action.icon className="text-muted-foreground size-5 stroke-[1.75]" />
          </Link>
        </Button>
      ))}
    </div>
  );
}
