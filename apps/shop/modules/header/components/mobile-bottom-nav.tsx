'use client';

import { useLogout } from '@/modules/auth/hooks/use-auth';
import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import {
  MobileBottomNavMenuSheet,
  type MobileBottomNavMenuItem,
} from '@/modules/header/components/mobile-bottom-nav-menu-sheet';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { MOBILE_SUPPORT_MENU_ITEMS } from '@/modules/header/constants/mobile-support-menu-items';
import { Button } from '@repo/ui/components/ui/button';
import { HeadphonesIcon, LogOutIcon, SearchIcon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type MobileBottomLink =
  | {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      type: 'link';
      href: string;
    }
  | {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      type: 'support-menu' | 'account-menu' | 'account-pending' | 'account-hydrate-shell';
    };

export function MobileBottomNav(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const logoutMutation = useLogout();
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [isSupportSheetOpen, setSupportSheetOpen] = useState<boolean>(false);
  const [isAccountSheetOpen, setAccountSheetOpen] = useState<boolean>(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const supportMenuItems: MobileBottomNavMenuItem[] = MOBILE_SUPPORT_MENU_ITEMS.map((item) => ({
    label: item.label,
    icon: item.icon,
  }));
  const accountMenuItems: MobileBottomNavMenuItem[] = [
    ...ACCOUNT_MENU_ITEMS.map((item) => ({
      label: item.label,
      icon: item.icon,
      href: item.href,
    })),
    {
      label: 'Đăng xuất',
      icon: LogOutIcon,
      disabled: logoutMutation.isPending,
      onClick: () => {
        void logoutMutation.mutateAsync();
        setAccountSheetOpen(false);
      },
    },
  ];
  const mobileBottomLinks: MobileBottomLink[] = [
    { label: 'Tìm kiếm', href: '/search', icon: SearchIcon, type: 'link' },
    !hasMounted
      ? { label: 'Tài khoản', icon: UserRoundIcon, type: 'account-hydrate-shell' }
      : !isAuthSessionReady
        ? { label: 'Tài khoản', icon: UserRoundIcon, type: 'account-pending' }
        : user
          ? { label: 'Tài khoản', icon: UserRoundIcon, type: 'account-menu' }
          : { label: 'Đăng nhập', href: '/login', icon: UserRoundIcon, type: 'link' },
    { label: 'Trợ giúp', icon: HeadphonesIcon, type: 'support-menu' },
  ];
  return (
    <>
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <ul className="grid h-16 grid-cols-3">
          {mobileBottomLinks.map((item) => (
            <li key={item.label}>
              {item.type === 'link' ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 text-xs"
                >
                  <item.icon className="size-4 stroke-[1.75]" />
                  <span>{item.label}</span>
                </Link>
              ) : item.type === 'account-menu' ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground h-full w-full rounded-none px-0 py-0 text-xs"
                  onClick={() => setAccountSheetOpen(true)}
                  aria-label="Mở menu tài khoản"
                >
                  <span className="flex h-full flex-col items-center justify-center gap-1">
                    <item.icon className="size-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </span>
                </Button>
              ) : item.type === 'account-hydrate-shell' ? (
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="Đang tải"
                  className="text-muted-foreground flex h-full cursor-default flex-col items-center justify-center gap-1 text-xs opacity-80"
                >
                  <item.icon className="size-4 stroke-[1.75]" />
                  <span>{item.label}</span>
                </div>
              ) : item.type === 'account-pending' ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled
                  aria-busy="true"
                  className="text-muted-foreground h-full w-full cursor-wait rounded-none px-0 py-0 text-xs opacity-80"
                  aria-label="Đang tải"
                >
                  <span className="flex h-full flex-col items-center justify-center gap-1">
                    <item.icon className="size-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground h-full w-full rounded-none px-0 py-0 text-xs"
                  onClick={() => setSupportSheetOpen(true)}
                  aria-label="Mở menu trợ giúp"
                >
                  <span className="flex h-full flex-col items-center justify-center gap-1">
                    <item.icon className="size-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <MobileBottomNavMenuSheet
        title="Trợ giúp"
        isOpen={isSupportSheetOpen}
        onOpenChange={setSupportSheetOpen}
        items={supportMenuItems}
      />
      <MobileBottomNavMenuSheet
        title="Tài khoản của tôi"
        isOpen={isAccountSheetOpen}
        onOpenChange={setAccountSheetOpen}
        items={accountMenuItems}
      />
    </>
  );
}
