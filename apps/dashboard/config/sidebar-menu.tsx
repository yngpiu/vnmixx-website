'use client';

import { ADMIN_MODULES, adminModulePath, type AdminModuleSlug } from '@/config/admin-modules';
import { dashboardRoutes } from '@/config/routes';
import {
  BarChart3Icon,
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

function moduleNav(
  slug: AdminModuleSlug,
  Icon: typeof PackageIcon,
  options?: { title?: string; url?: string },
): SidebarNavItem {
  return {
    title: options?.title ?? ADMIN_MODULES[slug].title,
    url: options?.url ?? adminModulePath(slug),
    icon: <Icon className="size-4 shrink-0" />,
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
    id: 'management',
    groupLabel: 'Quản lý',
    items: [
      moduleNav('orders', ShoppingCartIcon),
      moduleNav('products', PackageIcon),
      moduleNav('banners', ImageIcon),
      {
        title: 'Bộ sưu tập',
        url: dashboardRoutes.media,
        icon: <ImageIcon className="size-4 shrink-0" />,
      },
      moduleNav('categories', TagsIcon),
      moduleNav('colors', PaletteIcon),
      moduleNav('sizes', RulerIcon),
      moduleNav('customers', UsersIcon),
      moduleNav('inventory', TruckIcon),
      {
        title: 'Ưu đãi',
        url: dashboardRoutes.analytics,
        icon: <BarChart3Icon className="size-4 shrink-0" />,
      },
      {
        title: 'Đánh giá',
        url: dashboardRoutes.reviews,
        icon: <StarIcon className="size-4 shrink-0" />,
      },
      {
        title: 'Tin nhắn hỗ trợ',
        url: dashboardRoutes.supportChats,
        icon: <MessageSquareIcon className="size-4 shrink-0" />,
      },
      moduleNav('employees', UsersRoundIcon, { title: 'Nhân viên' }),
      moduleNav('roles', ShieldIcon, { title: 'Vai trò' }),
    ],
  },
  /*
   * Reports section intentionally disabled.
   * Uncomment when report routes are ready.
   */
  // {
  //   id: 'reports',
  //   groupLabel: 'Báo cáo',
  //   items: [
  //     {
  //       title: 'Doanh thu',
  //       url: '/reports?type=revenue',
  //       icon: <ChartColumnIcon className="size-4 shrink-0" />,
  //     },
  //     {
  //       title: 'Sản phẩm',
  //       url: '/reports?type=products',
  //       icon: <PackageIcon className="size-4 shrink-0" />,
  //     },
  //     {
  //       title: 'Khách hàng',
  //       url: '/reports?type=customers',
  //       icon: <UsersIcon className="size-4 shrink-0" />,
  //     },
  //     {
  //       title: 'Tồn kho',
  //       url: '/reports?type=inventory',
  //       icon: <TruckIcon className="size-4 shrink-0" />,
  //     },
  //   ],
  // },
  {
    id: 'system-admin',
    groupLabel: 'Hệ thống',
    items: [
      {
        title: 'Nhật ký thao tác',
        url: '/audit-logs',
        icon: <ClipboardListIcon className="size-4 shrink-0" />,
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
