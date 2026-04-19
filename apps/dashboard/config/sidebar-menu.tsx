import type { ReactNode } from 'react';

import { adminModulePath } from '@/lib/admin-modules';
import { dashboardRoutes } from '@/lib/routes';
import {
  BarChart3Icon,
  FileClockIcon,
  FolderTreeIcon,
  ImageIcon,
  LayoutDashboardIcon,
  MessageSquareTextIcon,
  PackageIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  ShoppingCartIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

export type SidebarNavLeaf = { title: string; url: string };

export type SidebarNavGroup = { title: string; items: SidebarNavLeaf[] };

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: ReactNode;
  isActive?: boolean;
  subtitle?: string;
  groups?: SidebarNavGroup[];
  items?: SidebarNavLeaf[];
};

export type SidebarSection = {
  id: string;
  groupLabel: string;
  groupLabelClassName?: string;
  items: SidebarNavItem[];
};

const dashboardItems: SidebarNavItem[] = [
  {
    title: 'Tổng quan',
    url: dashboardRoutes.overview,
    icon: <LayoutDashboardIcon />,
  },
  {
    title: 'Phân tích',
    url: dashboardRoutes.analytics,
    icon: <BarChart3Icon />,
  },
];

const catalogItems: SidebarNavItem[] = [
  {
    title: 'Danh mục',
    url: adminModulePath('categories'),
    icon: <FolderTreeIcon />,
  },
  {
    title: 'Sản phẩm',
    url: adminModulePath('products'),
    icon: <PackageIcon />,
  },
  {
    title: 'Màu sắc',
    url: adminModulePath('colors'),
    icon: <PaletteIcon />,
  },
  {
    title: 'Kích cỡ',
    url: adminModulePath('sizes'),
    icon: <RulerIcon />,
  },
  {
    title: 'Bộ sưu tập',
    url: '/media',
    icon: <ImageIcon />,
  },
];

const systemItems: SidebarNavItem[] = [
  {
    title: 'Nhật ký thao tác',
    url: '/audit-logs',
    icon: <FileClockIcon />,
  },
];

export const sidebarSections: SidebarSection[] = [
  {
    id: 'stats',
    groupLabel: 'Thống kê',
    items: dashboardItems,
  },
  {
    id: 'commerce',
    groupLabel: 'Bán hàng',
    items: [
      {
        title: 'Đơn hàng',
        url: adminModulePath('orders'),
        icon: <ShoppingCartIcon />,
      },
      {
        title: 'Đánh giá',
        url: '/reviews',
        icon: <MessageSquareTextIcon />,
      },
    ],
  },
  {
    id: 'accounts',
    groupLabel: 'Người dùng',
    items: [
      {
        title: 'Khách hàng',
        url: adminModulePath('customers'),
        icon: <UsersIcon />,
      },
      {
        title: 'Nhân viên',
        url: adminModulePath('employees'),
        icon: <UserCogIcon />,
      },
      {
        title: 'Vai trò',
        url: adminModulePath('roles'),
        icon: <ShieldIcon />,
      },
    ],
  },
  {
    id: 'catalog',
    groupLabel: 'Sản phẩm',
    items: catalogItems,
  },
  {
    id: 'system',
    groupLabel: 'Hệ thống',
    items: systemItems,
  },
];
