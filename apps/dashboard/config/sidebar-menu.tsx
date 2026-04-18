import type { ReactNode } from 'react';

import { adminModulePath } from '@/lib/admin-modules';
import { dashboardRoutes } from '@/lib/routes';
import {
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

const dashboardItem: SidebarNavItem = {
  title: 'Dashboard',
  url: dashboardRoutes.root,
  icon: <LayoutDashboardIcon />,
  items: [
    { title: 'Tổng quan', url: dashboardRoutes.root },
    { title: 'Phân tích', url: dashboardRoutes.analytics },
  ],
};

const catalogItems: SidebarNavItem[] = [
  {
    title: 'Sản phẩm',
    url: adminModulePath('products'),
    icon: <PackageIcon />,
  },
  {
    title: 'Danh mục',
    url: adminModulePath('categories'),
    icon: <FolderTreeIcon />,
  },
  {
    title: 'Thư viện ảnh',
    url: '/media',
    icon: <ImageIcon />,
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
];

export const sidebarSections: SidebarSection[] = [
  {
    id: 'overview',
    groupLabel: 'Tổng quan',
    items: [dashboardItem],
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
        title: 'Review',
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
      {
        title: 'Audit log',
        url: '/audit-logs',
        icon: <FileClockIcon />,
      },
    ],
  },
  {
    id: 'catalog',
    groupLabel: 'Catalog',
    groupLabelClassName: 'text-sm font-semibold text-sidebar-foreground',
    items: catalogItems,
  },
];
