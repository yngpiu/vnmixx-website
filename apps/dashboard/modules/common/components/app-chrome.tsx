'use client';

import { DashboardShell } from '@/modules/common/components/sidebar/dashboard-shell';
import { usePathname } from 'next/navigation';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin =
    pathname === '/login' || (typeof pathname === 'string' && pathname.startsWith('/login/'));

  if (isLogin) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
