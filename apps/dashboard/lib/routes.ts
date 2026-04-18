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
  /** Lối vào `/`; redirect sang `overview`. */
  root: '/',
  /** Tổng quan (thống kê). */
  overview: '/dashboard',
  analytics: '/analytics',
  reviews: '/reviews',
  settings: '/settings',
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
  if (path === dashboardRoutes.overview) {
    return [{ label: 'Tổng quan' }];
  }
  if (path === '/' || path === dashboardRoutes.root) {
    return [{ label: 'Tổng quan', href: dashboardRoutes.overview }];
  }
  if (path === dashboardRoutes.analytics) {
    return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Phân tích' }];
  }
  if (path === dashboardRoutes.reviews) {
    return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Đánh giá' }];
  }
  if (path === dashboardRoutes.settings) {
    return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Cài đặt cá nhân' }];
  }
  const orderDetailMatch = /^\/orders\/([^/]+)\/?$/.exec(path);
  const orderCodeSeg = orderDetailMatch?.[1];
  if (orderCodeSeg && orderCodeSeg !== 'new') {
    return [
      { label: 'Trang chủ', href: dashboardRoutes.overview },
      { label: 'Đơn hàng', href: '/orders' },
      { label: orderCodeSeg },
    ];
  }
  if (path === '/media') {
    return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Thư viện ảnh' }];
  }
  if (path === '/audit-logs') {
    return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Nhật ký thao tác' }];
  }
  const newMatch = /^\/([^/]+)\/new\/?$/.exec(path);
  const newSlug = newMatch?.[1];
  if (newSlug && isAdminModuleSlug(newSlug)) {
    const adminModule = ADMIN_MODULES[newSlug];
    return [
      { label: 'Trang chủ', href: dashboardRoutes.overview },
      { label: adminModule.title, href: `/${newSlug}` },
      { label: 'Thêm mới' },
    ];
  }
  const editMatch = /^\/([^/]+)\/([^/]+)\/edit\/?$/.exec(path);
  const editSlug = editMatch?.[1];
  if (editSlug && isAdminModuleSlug(editSlug)) {
    const adminModule = ADMIN_MODULES[editSlug];
    return [
      { label: 'Trang chủ', href: dashboardRoutes.overview },
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
      { label: 'Trang chủ', href: dashboardRoutes.overview },
      { label: adminModule.title, href: `/${detailSlug}` },
      { label: 'Chi tiết' },
    ];
  }
  const listMatch = /^\/([^/]+)\/?$/.exec(path);
  const listSlug = listMatch?.[1];
  if (listSlug && isAdminModuleSlug(listSlug)) {
    const adminModule = getAdminModule(listSlug);
    if (adminModule) {
      return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: adminModule.title }];
    }
  }
  return [{ label: 'Trang chủ', href: dashboardRoutes.overview }, { label: 'Trang' }];
}
