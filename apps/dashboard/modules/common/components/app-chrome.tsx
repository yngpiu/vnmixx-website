'use client';

import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { canAccessPath } from '@/modules/auth/utils/dashboard-authz';
import { ForbiddenView } from '@/modules/common/components/authz/forbidden-view';
import { DashboardShell } from '@/modules/common/components/sidebar/dashboard-shell';
import { usePathname } from 'next/navigation';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isLogin =
    pathname === '/login' || (typeof pathname === 'string' && pathname.startsWith('/login/'));

  if (isLogin) {
    return <>{children}</>;
  }

  if (accessToken && user && !canAccessPath(pathname, user.permissions)) {
    return (
      <DashboardShell>
        <ForbiddenView />
      </DashboardShell>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
