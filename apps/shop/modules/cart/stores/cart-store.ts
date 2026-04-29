import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CartUiState {
  isDrawerOpen: boolean;
}

interface CartUiActions {
  setDrawerOpen: (isOpen: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

type CartUiStore = CartUiState & CartUiActions;

export const useCartStore = create<CartUiStore>()(
  devtools(
    (set) => ({
      isDrawerOpen: false,
      setDrawerOpen: (isOpen: boolean) =>
        set({ isDrawerOpen: isOpen }, undefined, 'cart/setDrawerOpen'),
      openDrawer: () => set({ isDrawerOpen: true }, undefined, 'cart/openDrawer'),
      closeDrawer: () => set({ isDrawerOpen: false }, undefined, 'cart/closeDrawer'),
    }),
    {
      name: 'ShopCartUiStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
