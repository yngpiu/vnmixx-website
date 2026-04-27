/** Slugs và nhãn khớp với các module / route admin trong `apps/api` (NestJS). */

export const ADMIN_MODULE_SLUGS = [
  'orders',
  'customers',
  'employees',
  'support-chats',
  'products',
  'categories',
  'colors',
  'sizes',
  'roles',
  'permissions',
  'inventory',
] as const;

export type AdminModuleSlug = (typeof ADMIN_MODULE_SLUGS)[number];

export type AdminModuleMeta = {
  /** Tiêu đề hiển thị (UI) */
  title: string;
  /** Prefix path trên API (không có leading slash) */
  apiPath: string;
  /** Tên file module trong `apps/api/src` */
  moduleName: string;
};

export const ADMIN_MODULES: Record<AdminModuleSlug, AdminModuleMeta> = {
  orders: {
    title: 'Đơn hàng',
    apiPath: 'admin/orders',
    moduleName: 'OrderModule',
  },
  customers: {
    title: 'Khách hàng',
    apiPath: 'admin/customers',
    moduleName: 'CustomerModule',
  },
  employees: {
    title: 'Nhân viên',
    apiPath: 'admin/employees',
    moduleName: 'EmployeeModule',
  },
  'support-chats': {
    title: 'Tin nhắn hỗ trợ',
    apiPath: 'admin/support-chats',
    moduleName: 'SupportChatModule',
  },
  products: {
    title: 'Sản phẩm',
    apiPath: 'admin/products',
    moduleName: 'ProductModule',
  },
  categories: {
    title: 'Danh mục',
    apiPath: 'admin/categories',
    moduleName: 'CategoryModule',
  },
  colors: {
    title: 'Màu sắc',
    apiPath: 'admin/colors',
    moduleName: 'ColorModule',
  },
  sizes: {
    title: 'Kích cỡ',
    apiPath: 'admin/sizes',
    moduleName: 'SizeModule',
  },
  roles: {
    title: 'Vai trò',
    apiPath: 'admin/roles',
    moduleName: 'RbacModule',
  },
  permissions: {
    title: 'Quyền',
    apiPath: 'admin/permissions',
    moduleName: 'RbacModule',
  },
  inventory: {
    title: 'Kho hàng',
    apiPath: 'admin/inventory',
    moduleName: 'DashboardModule',
  },
};

export function isAdminModuleSlug(slug: string): slug is AdminModuleSlug {
  return (ADMIN_MODULE_SLUGS as readonly string[]).includes(slug);
}

export function getAdminModule(slug: string): AdminModuleMeta | null {
  if (!isAdminModuleSlug(slug)) return null;
  return ADMIN_MODULES[slug];
}

export function adminModulePath(slug: AdminModuleSlug): string {
  return `/${slug}`;
}

export function adminModuleNewPath(slug: AdminModuleSlug): string {
  return `/${slug}/new`;
}

export function adminModuleEditPath(slug: AdminModuleSlug, id: number): string {
  return `/${slug}/${id}/edit`;
}

export function adminModuleDetailPath(slug: AdminModuleSlug, id: number): string {
  return `/${slug}/${id}`;
}
