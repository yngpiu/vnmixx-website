'use client';

import type { CategoryAdminTreeNode } from '@/modules/categories/types/category';
import { createContext, useContext, type ReactNode } from 'react';

export type CategoriesTableActionsContextValue = {
  openCategoryDetail: (node: CategoryAdminTreeNode) => void;
  openToggleActive: (node: CategoryAdminTreeNode) => void;
  openToggleFeatured: (node: CategoryAdminTreeNode) => void;
  openDeleteCategory: (node: CategoryAdminTreeNode) => void;
  openRestoreCategory: (node: CategoryAdminTreeNode) => void;
  /** Cấp 1–2, cha đang hoạt động: mở dialog tạo con (tối đa 3 cấp). */
  openCreateChild?: (parent: CategoryAdminTreeNode) => void;
};

const CategoriesTableActionsContext = createContext<CategoriesTableActionsContextValue | null>(
  null,
);

export function CategoriesTableActionsProvider({
  children,
  openCategoryDetail,
  openToggleActive,
  openToggleFeatured,
  openDeleteCategory,
  openRestoreCategory,
  openCreateChild,
}: {
  children: ReactNode;
} & CategoriesTableActionsContextValue) {
  return (
    <CategoriesTableActionsContext.Provider
      value={{
        openCategoryDetail,
        openToggleActive,
        openToggleFeatured,
        openDeleteCategory,
        openRestoreCategory,
        openCreateChild,
      }}
    >
      {children}
    </CategoriesTableActionsContext.Provider>
  );
}

export function useCategoriesTableActions(): CategoriesTableActionsContextValue {
  const ctx = useContext(CategoriesTableActionsContext);
  if (!ctx) {
    throw new Error('useCategoriesTableActions chỉ dùng trong CategoriesTableActionsProvider.');
  }
  return ctx;
}
