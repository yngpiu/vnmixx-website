import {
  ADMIN_MODULES,
  getAdminModule,
  isAdminModuleSlug,
  type AdminModuleSlug,
} from '@/lib/admin-modules';

/** Đường dẫn dashboard (không dùng prefix `/home`). */
export const dashboardRoutes = {
  root: '/',
  analytics: '/analytics',
  reports: '/reports',
} as const;

export function moduleListPath(slug: AdminModuleSlug): string {
  return `/${slug}`;
}

export function moduleNewPath(slug: AdminModuleSlug): string {
  return `/${slug}/new`;
}

/** Tiêu đề breadcrumb theo `pathname`. */
export function dashboardBreadcrumbPageTitle(pathname: string): string {
  const path = pathname === '' ? '/' : pathname;

  if (path === '/' || path === dashboardRoutes.root) return 'Tổng quan';
  if (path === dashboardRoutes.analytics) return 'Phân tích';
  if (path === dashboardRoutes.reports) return 'Báo cáo';

  const newMatch = /^\/([^/]+)\/new\/?$/.exec(path);
  const newSlug = newMatch?.[1];
  if (newSlug && isAdminModuleSlug(newSlug)) {
    const mod = ADMIN_MODULES[newSlug];
    return `Thêm mới · ${mod.title}`;
  }

  const listMatch = /^\/([^/]+)\/?$/.exec(path);
  const listSlug = listMatch?.[1];
  if (listSlug && isAdminModuleSlug(listSlug)) {
    const mod = getAdminModule(listSlug);
    if (mod) return mod.title;
  }

  return 'Trang';
}
