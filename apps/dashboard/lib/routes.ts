import {
  ADMIN_MODULES,
  getAdminModule,
  isAdminModuleSlug,
  type AdminModuleSlug,
} from '@/lib/admin-modules';

export type DashboardBreadcrumbItem = {
  readonly label: string;
  readonly href?: string;
};

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
  const breadcrumbs = dashboardBreadcrumbs(pathname);
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  return currentBreadcrumb?.label ?? 'Trang';
}

export function dashboardBreadcrumbs(pathname: string): DashboardBreadcrumbItem[] {
  const path = pathname === '' ? '/' : pathname;
  if (path === '/' || path === dashboardRoutes.root) {
    return [{ label: 'Trang chủ' }];
  }
  if (path === dashboardRoutes.analytics) {
    return [{ label: 'Trang chủ', href: dashboardRoutes.root }, { label: 'Phân tích' }];
  }
  if (path === dashboardRoutes.reports) {
    return [{ label: 'Trang chủ', href: dashboardRoutes.root }, { label: 'Báo cáo' }];
  }
  if (path === '/media') {
    return [{ label: 'Trang chủ', href: dashboardRoutes.root }, { label: 'Thư viện ảnh' }];
  }
  const newMatch = /^\/([^/]+)\/new\/?$/.exec(path);
  const newSlug = newMatch?.[1];
  if (newSlug && isAdminModuleSlug(newSlug)) {
    const adminModule = ADMIN_MODULES[newSlug];
    return [
      { label: 'Trang chủ', href: dashboardRoutes.root },
      { label: adminModule.title, href: `/${newSlug}` },
      { label: 'Thêm mới' },
    ];
  }
  const editMatch = /^\/([^/]+)\/([^/]+)\/edit\/?$/.exec(path);
  const editSlug = editMatch?.[1];
  if (editSlug && isAdminModuleSlug(editSlug)) {
    const adminModule = ADMIN_MODULES[editSlug];
    return [
      { label: 'Trang chủ', href: dashboardRoutes.root },
      { label: adminModule.title, href: `/${editSlug}` },
      { label: 'Chỉnh sửa' },
    ];
  }
  const detailMatch = /^\/([^/]+)\/([^/]+)\/?$/.exec(path);
  const detailSlug = detailMatch?.[1];
  const detailId = detailMatch?.[2];
  if (detailSlug && detailId && isAdminModuleSlug(detailSlug) && detailId !== 'new') {
    const adminModule = ADMIN_MODULES[detailSlug];
    return [
      { label: 'Trang chủ', href: dashboardRoutes.root },
      { label: adminModule.title, href: `/${detailSlug}` },
      { label: 'Chi tiết' },
    ];
  }
  const listMatch = /^\/([^/]+)\/?$/.exec(path);
  const listSlug = listMatch?.[1];
  if (listSlug && isAdminModuleSlug(listSlug)) {
    const adminModule = getAdminModule(listSlug);
    if (adminModule) {
      return [{ label: 'Trang chủ', href: dashboardRoutes.root }, { label: adminModule.title }];
    }
  }
  return [{ label: 'Trang chủ', href: dashboardRoutes.root }, { label: 'Trang' }];
}
