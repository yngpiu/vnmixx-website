'use client';

import type { CategoriesTableActionsContextValue } from '@/modules/categories/types/category';
import { createContext, useContext, type ReactNode } from 'react';

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
