import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface HeaderUiState {
  isMobileDrawerOpen: boolean;
  expandedMobileCategorySlugs: string[];
  activeTopLevelCategorySlug: string | null;
}

interface HeaderUiActions {
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  setMobileDrawerOpen: (isOpen: boolean) => void;
  toggleMobileCategory: (slug: string) => void;
  setActiveTopLevelCategorySlug: (slug: string | null) => void;
  resetMobileMenuState: () => void;
}

type HeaderUiStore = HeaderUiState & HeaderUiActions;

function hasExpandedCategory(expandedSlugs: string[], slug: string): boolean {
  return expandedSlugs.includes(slug);
}

export const useHeaderUiStore = create<HeaderUiStore>()(
  devtools(
    (set) => ({
      isMobileDrawerOpen: false,
      expandedMobileCategorySlugs: [],
      activeTopLevelCategorySlug: null,
      openMobileDrawer: () =>
        set({ isMobileDrawerOpen: true }, undefined, 'header/openMobileDrawer'),
      closeMobileDrawer: () =>
        set(
          { isMobileDrawerOpen: false, expandedMobileCategorySlugs: [] },
          undefined,
          'header/closeMobileDrawer',
        ),
      setMobileDrawerOpen: (isOpen: boolean) =>
        set(
          (state) => ({
            isMobileDrawerOpen: isOpen,
            expandedMobileCategorySlugs: isOpen ? state.expandedMobileCategorySlugs : [],
          }),
          undefined,
          'header/setMobileDrawerOpen',
        ),
      toggleMobileCategory: (slug: string) =>
        set(
          (state) => {
            const expandedSlugs = state.expandedMobileCategorySlugs;
            if (hasExpandedCategory(expandedSlugs, slug)) {
              return {
                expandedMobileCategorySlugs: expandedSlugs.filter(
                  (expandedSlug) => expandedSlug !== slug,
                ),
              };
            }
            return {
              expandedMobileCategorySlugs: [...expandedSlugs, slug],
            };
          },
          undefined,
          'header/toggleMobileCategory',
        ),
      setActiveTopLevelCategorySlug: (slug: string | null) =>
        set(
          { activeTopLevelCategorySlug: slug },
          undefined,
          'header/setActiveTopLevelCategorySlug',
        ),
      resetMobileMenuState: () =>
        set({ expandedMobileCategorySlugs: [] }, undefined, 'header/resetMobileMenuState'),
    }),
    {
      name: 'ShopHeaderUiStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
