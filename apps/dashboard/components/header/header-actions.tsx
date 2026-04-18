'use client';

import { useLogout } from '@/hooks/use-auth';
import { pravatarFromEmail } from '@/lib/avatar';
import { dashboardRoutes } from '@/lib/routes';
import { useTheme, type ThemeMode } from '@/providers/theme-provider';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import { LogOutIcon, MonitorCogIcon, MoonIcon, SettingsIcon, SunIcon } from 'lucide-react';
import Link from 'next/link';

function getAvatarFallback(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function getThemeLabel(theme: ThemeMode): string {
  if (theme === 'light') return 'Sáng';
  if (theme === 'dark') return 'Tối';
  return 'Hệ thống';
}

export function HeaderActions() {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme } = useTheme();
  const userName = user?.fullName ?? 'Nhân viên';
  const userEmail = user?.email ?? '';
  const avatarSrc =
    user?.avatarUrl?.trim() || (userEmail ? pravatarFromEmail(userEmail) : undefined);

  return (
    <div className="flex shrink-0 items-center gap-1.5 pl-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Chọn giao diện"
          >
            {theme === 'light' ? (
              <SunIcon className="size-4" />
            ) : theme === 'dark' ? (
              <MoonIcon className="size-4" />
            ) : (
              <MonitorCogIcon className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Giao diện: {getThemeLabel(theme)}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemeMode)}
          >
            <DropdownMenuRadioItem value="light">Sáng</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Tối</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">Theo hệ thống</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" variant="ghost" size="icon" className="size-9" asChild>
        <Link href={dashboardRoutes.settings} aria-label="Mở cài đặt">
          <SettingsIcon className="size-4" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-none bg-transparent p-0 outline-none ring-offset-background transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:bg-muted"
            aria-label="Menu tài khoản"
          >
            <Avatar className="size-9">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={userName} /> : null}
              <AvatarFallback>{getAvatarFallback(userName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56 rounded-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="grid gap-0.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={() => {
              logout.mutate();
            }}
          >
            <LogOutIcon />
            {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
