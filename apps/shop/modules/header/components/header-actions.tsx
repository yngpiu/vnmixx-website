'use client';

import { useLogout } from '@/modules/auth/hooks/use-auth';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import {
  CircleHelpIcon,
  HeadsetIcon,
  HeartIcon,
  LogOutIcon,
  MapPinIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const HEADER_ACTIONS = [
  { label: 'Hỗ trợ', icon: HeadsetIcon, href: '/support' },
  { label: 'Giỏ hàng', icon: ShoppingBagIcon, href: '/cart' },
] as const;

const ACCOUNT_MENU_ITEMS = [
  { label: 'Thông tin tài khoản', icon: UserRoundIcon, href: '/tai-khoan' },
  { label: 'Quản lý đơn hàng', icon: RefreshCwIcon, href: '/tai-khoan/don-hang' },
  { label: 'Sổ địa chỉ', icon: MapPinIcon, href: '/tai-khoan/dia-chi' },
  { label: 'Sản phẩm đã xem', icon: WalletCardsIcon, href: '/tai-khoan/da-xem' },
  { label: 'Sản phẩm yêu thích', icon: HeartIcon, href: '/tai-khoan/yeu-thich' },
  { label: 'Hỏi đáp sản phẩm', icon: CircleHelpIcon, href: '/tai-khoan/hoi-dap' },
  { label: 'Hỗ trợ - IVY', icon: HeadsetIcon, href: '/support' },
] as const;

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
          <DropdownMenuContent align="end" className="w-[340px] rounded-none p-0">
            <div className="px-8 py-6 text-[38px] font-semibold leading-tight">
              Tài khoản của tôi
            </div>
            <DropdownMenuSeparator className="my-0" />
            <div className="px-6 py-3">
              {ACCOUNT_MENU_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  asChild
                  className="h-12 rounded-none px-3 text-[32px]"
                >
                  <Link href={item.href}>
                    <item.icon className="text-muted-foreground/80 mr-3 size-7 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className="mt-1 h-12 rounded-none px-3 text-[32px]"
                onClick={executeLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOutIcon className="text-muted-foreground/80 mr-3 size-7 stroke-[1.75]" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        ) : null}
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
