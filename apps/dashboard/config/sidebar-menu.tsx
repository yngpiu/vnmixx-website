'use client';

import { ADMIN_MODULES, adminModulePath, type AdminModuleSlug } from '@/config/admin-modules';
import { dashboardRoutes } from '@/config/routes';
import {
  canAccessReadPermission,
  readPermissionForModuleSlug,
  type ReadPermission,
} from '@/modules/auth/utils/dashboard-authz';
import {
  BookOpenIcon,
  ClipboardListIcon,
  ImageIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PackageIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  ShoppingCartIcon,
  StarIcon,
  TagsIcon,
  TruckIcon,
  UsersIcon,
  UsersRoundIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type SidebarNavItem = {
  title: string;
  url: string;
  icon?: ReactNode;
  subtitle?: string;
  isActive?: boolean;
  requiredReadPermission?: ReadPermission | null;
  items?: { title: string; url: string }[];
  groups?: { title: string; items: { title: string; url: string }[] }[];
};

export type SidebarSection = {
  id: string;
  groupLabel: string;
  groupLabelClassName?: string;
  items: SidebarNavItem[];
};

export type DashboardSearchEntry = {
  readonly label: string;
  readonly href: string;
  readonly group: string;
  readonly requiredReadPermission?: ReadPermission | null;
};

function moduleNav(
  slug: AdminModuleSlug,
  Icon: typeof PackageIcon,
  options?: { title?: string; url?: string },
): SidebarNavItem {
  return {
    title: options?.title ?? ADMIN_MODULES[slug].title,
    url: options?.url ?? adminModulePath(slug),
    icon: <Icon className="size-4 shrink-0" />,
    requiredReadPermission: readPermissionForModuleSlug(slug),
  };
}

export const sidebarSections: SidebarSection[] = [
  {
    id: 'overview',
    groupLabel: '',
    items: [
      {
        title: 'Tổng quan',
        url: dashboardRoutes.overview,
        icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
      },
    ],
  },
  {
    id: 'sales',
    groupLabel: 'Bán hàng',
    items: [
      moduleNav('orders', ShoppingCartIcon),
      moduleNav('customers', UsersIcon),
      {
        title: 'Đánh giá',
        url: dashboardRoutes.reviews,
        icon: <StarIcon className="size-4 shrink-0" />,
        requiredReadPermission: 'review.read',
      },
      {
        title: 'Hỗ trợ trực tuyến',
        url: dashboardRoutes.supportChats,
        icon: <MessageSquareIcon className="size-4 shrink-0" />,
        requiredReadPermission: 'support-chat.read',
      },
    ],
  },
  {
    id: 'products',
    groupLabel: 'Sản phẩm',
    items: [
      moduleNav('products', PackageIcon),
      moduleNav('categories', TagsIcon),
      {
        title: 'Bộ sưu tập',
        url: dashboardRoutes.media,
        icon: <ImageIcon className="size-4 shrink-0" />,
        requiredReadPermission: 'media.read',
      },
      moduleNav('colors', PaletteIcon),
      moduleNav('sizes', RulerIcon),
      moduleNav('inventory', TruckIcon),
    ],
  },
  {
    id: 'human-resources',
    groupLabel: 'Nhân sự',
    items: [
      moduleNav('employees', UsersRoundIcon, { title: 'Nhân viên' }),
      moduleNav('roles', ShieldIcon, { title: 'Vai trò' }),
    ],
  },
  {
    id: 'content',
    groupLabel: 'Nội dung',
    items: [moduleNav('banners', ImageIcon), moduleNav('knowledge', BookOpenIcon)],
  },
  {
    id: 'system-admin',
    groupLabel: 'Hệ thống',
    items: [
      {
        title: 'Nhật ký thao tác',
        url: '/audit-logs',
        icon: <ClipboardListIcon className="size-4 shrink-0" />,
        requiredReadPermission: 'audit.read',
      },
    ],
  },
];

export function filterSidebarSectionsByPermissions(
  permissions: readonly string[],
  sections: readonly SidebarSection[] = sidebarSections,
): SidebarSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessReadPermission(permissions, item.requiredReadPermission ?? null),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function getDashboardSearchEntries(permissions: readonly string[]): DashboardSearchEntry[] {
  const sections = filterSidebarSectionsByPermissions(permissions);
  const entries: DashboardSearchEntry[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      entries.push({
        label: item.title,
        href: item.url,
        group: section.groupLabel,
        requiredReadPermission: item.requiredReadPermission ?? null,
      });
      if (item.items) {
        for (const sub of item.items) {
          if (sub.url === item.url) continue;
          entries.push({
            label: `${item.title} — ${sub.title}`,
            href: sub.url,
            group: section.groupLabel,
            requiredReadPermission: item.requiredReadPermission ?? null,
          });
        }
      }
      if (item.groups) {
        for (const g of item.groups) {
          for (const sub of g.items) {
            entries.push({
              label: `${item.title} — ${g.title} — ${sub.title}`,
              href: sub.url,
              group: section.groupLabel,
              requiredReadPermission: item.requiredReadPermission ?? null,
            });
          }
        }
      }
    }
  }
  entries.push({
    label: 'Cài đặt cá nhân',
    href: dashboardRoutes.settings,
    group: 'Tài khoản',
    requiredReadPermission: null,
  });
  return entries;
}
