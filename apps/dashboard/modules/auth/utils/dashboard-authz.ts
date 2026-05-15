import { isAdminModuleSlug, type AdminModuleSlug } from '@/config/admin-modules';

export type ReadPermission = `${string}.read`;

const MODULE_READ_PERMISSIONS: Record<AdminModuleSlug, ReadPermission | null> = {
  orders: 'order.read',
  customers: 'customer.read',
  employees: 'employee.read',
  'support-chats': 'support-chat.read',
  products: 'product.read',
  banners: 'banner.read',
  categories: 'category.read',
  colors: 'color.read',
  sizes: 'size.read',
  roles: 'rbac.read',
  permissions: 'rbac.read',
  inventory: 'inventory.read',
  knowledge: 'knowledge.read',
};

const STATIC_ROUTE_READ_PERMISSIONS: Record<string, ReadPermission | null> = {
  '/audit-logs': 'audit.read',
  '/reviews': 'review.read',
  '/support-chats': 'support-chat.read',
  '/media': 'media.read',
  '/dashboard': null,
  '/settings': null,
};

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const withoutQuery = pathname.split('?')[0] ?? pathname;
  const withoutHash = withoutQuery.split('#')[0] ?? withoutQuery;
  return withoutHash.endsWith('/') && withoutHash !== '/' ? withoutHash.slice(0, -1) : withoutHash;
}

function hasPermission(permissions: readonly string[], required: string | null): boolean {
  if (!required) return true;
  return permissions.includes(required);
}

export function readPermissionForModuleSlug(slug: AdminModuleSlug): ReadPermission | null {
  return MODULE_READ_PERMISSIONS[slug];
}

export function canAccessReadPermission(
  permissions: readonly string[],
  required: ReadPermission | null,
): boolean {
  return hasPermission(permissions, required);
}

export function canAccessPath(pathname: string, permissions: readonly string[]): boolean {
  const required = requiredReadPermissionForPath(pathname);
  return hasPermission(permissions, required);
}

export function requiredReadPermissionForPath(pathname: string): ReadPermission | null {
  const normalized = normalizePathname(pathname);
  if (normalized === '/' || normalized.startsWith('/login')) {
    return null;
  }

  const direct = STATIC_ROUTE_READ_PERMISSIONS[normalized];
  if (direct !== undefined) {
    return direct;
  }

  const firstSegment = normalized.split('/').filter(Boolean)[0];
  if (!firstSegment || !isAdminModuleSlug(firstSegment)) {
    return null;
  }

  return readPermissionForModuleSlug(firstSegment);
}
