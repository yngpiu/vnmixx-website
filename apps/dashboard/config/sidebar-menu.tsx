import type { ReactNode } from 'react';

import { adminModuleNewPath, adminModulePath } from '@/lib/admin-modules';
import { dashboardRoutes } from '@/lib/routes';
import {
  FolderTreeIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  ShoppingCartIcon,
  TagsIcon,
  TruckIcon,
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
    { title: 'Báo cáo', url: dashboardRoutes.reports },
  ],
};

const catalogItems: SidebarNavItem[] = [
  {
    title: 'Sản phẩm',
    url: adminModulePath('products'),
    icon: <PackageIcon />,
    items: [
      { title: 'Danh sách', url: adminModulePath('products') },
      { title: 'Thêm mới', url: adminModuleNewPath('products') },
    ],
  },
  {
    title: 'Danh mục',
    url: adminModulePath('categories'),
    icon: <FolderTreeIcon />,
    items: [
      { title: 'Danh sách', url: adminModulePath('categories') },
      { title: 'Thêm mới', url: adminModuleNewPath('categories') },
    ],
  },
  {
    title: 'Màu sắc',
    url: adminModulePath('colors'),
    icon: <PaletteIcon />,
    items: [
      { title: 'Danh sách', url: adminModulePath('colors') },
      { title: 'Thêm mới', url: adminModuleNewPath('colors') },
    ],
  },
  {
    title: 'Kích cỡ',
    url: adminModulePath('sizes'),
    icon: <RulerIcon />,
    items: [
      { title: 'Danh sách', url: adminModulePath('sizes') },
      { title: 'Thêm mới', url: adminModuleNewPath('sizes') },
    ],
  },
  {
    title: 'Thuộc tính',
    url: adminModulePath('attributes'),
    icon: <TagsIcon />,
    items: [
      { title: 'Danh sách', url: adminModulePath('attributes') },
      { title: 'Thêm mới', url: adminModuleNewPath('attributes') },
    ],
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
        items: [
          { title: 'Danh sách', url: adminModulePath('orders') },
          { title: 'Thêm mới', url: adminModuleNewPath('orders') },
        ],
      },
      {
        title: 'Vận chuyển',
        url: adminModulePath('shipping'),
        icon: <TruckIcon />,
        items: [
          { title: 'Danh sách', url: adminModulePath('shipping') },
          { title: 'Thêm mới', url: adminModuleNewPath('shipping') },
        ],
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
    ],
  },
  {
    id: 'catalog',
    groupLabel: 'Catalog',
    groupLabelClassName: 'text-sm font-semibold text-sidebar-foreground',
    items: catalogItems,
  },
  {
    id: 'system',
    groupLabel: 'Hệ thống',
    items: [
      {
        title: 'Vai trò',
        url: adminModulePath('roles'),
        icon: <ShieldIcon />,
      },
      {
        title: 'Quyền',
        url: adminModulePath('permissions'),
        icon: <KeyRoundIcon />,
      },
    ],
  },
];
