'use client';

import { ADMIN_MODULES, adminModulePath, type AdminModuleSlug } from '@/config/admin-modules';
import { dashboardRoutes } from '@/config/routes';
import {
  BarChart3Icon,
  ClipboardListIcon,
  FolderOpenIcon,
  ImageIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  ShoppingCartIcon,
  StarIcon,
  TagsIcon,
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
};

function moduleNav(slug: AdminModuleSlug, Icon: typeof PackageIcon): SidebarNavItem {
  return {
    title: ADMIN_MODULES[slug].title,
    url: adminModulePath(slug),
    icon: <Icon className="size-4 shrink-0" />,
  };
}

export const sidebarSections: SidebarSection[] = [
  {
    id: 'overview',
    groupLabel: 'Tổng quan',
    items: [
      {
        title: 'Tổng quan',
        url: dashboardRoutes.overview,
        icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
      },
      {
        title: 'Phân tích',
        url: dashboardRoutes.analytics,
        icon: <BarChart3Icon className="size-4 shrink-0" />,
      },
      {
        title: 'Đánh giá',
        url: dashboardRoutes.reviews,
        icon: <StarIcon className="size-4 shrink-0" />,
      },
    ],
  },
  {
    id: 'commerce',
    groupLabel: 'Bán hàng',
    items: [moduleNav('orders', ShoppingCartIcon), moduleNav('customers', UsersIcon)],
  },
  {
    id: 'catalog',
    groupLabel: 'Sản phẩm & danh mục',
    items: [
      moduleNav('products', PackageIcon),
      moduleNav('categories', TagsIcon),
      moduleNav('colors', PaletteIcon),
      moduleNav('sizes', RulerIcon),
    ],
  },
  {
    id: 'org',
    groupLabel: 'Tổ chức',
    items: [moduleNav('employees', UsersRoundIcon), moduleNav('roles', ShieldIcon)],
  },
  {
    id: 'system',
    groupLabel: 'Hệ thống',
    items: [
      {
        title: 'Bộ sưu tập',
        url: '/media',
        icon: <ImageIcon className="size-4 shrink-0" />,
      },
      {
        title: 'Nhật ký thao tác',
        url: '/audit-logs',
        icon: <ClipboardListIcon className="size-4 shrink-0" />,
      },
      {
        title: 'Báo cáo',
        url: '/reports',
        icon: <FolderOpenIcon className="size-4 shrink-0" />,
      },
    ],
  },
];

export function getDashboardSearchEntries(): DashboardSearchEntry[] {
  const entries: DashboardSearchEntry[] = [];
  for (const section of sidebarSections) {
    for (const item of section.items) {
      entries.push({
        label: item.title,
        href: item.url,
        group: section.groupLabel,
      });
      if (item.items) {
        for (const sub of item.items) {
          if (sub.url === item.url) continue;
          entries.push({
            label: `${item.title} — ${sub.title}`,
            href: sub.url,
            group: section.groupLabel,
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
  });
  return entries;
}
