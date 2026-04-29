'use client';

import {
  addMyCartItem,
  clearMyCart,
  getMyCart,
  removeMyCartItem,
  updateMyCartItem,
} from '@/modules/cart/api/cart';
import type { AddCartItemPayload, Cart, CartItem } from '@/modules/cart/types/cart';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const CART_QUERY_KEY = ['shop', 'me', 'cart'] as const;

function updateCartItemList(cart: Cart, updatedItem: CartItem): Cart {
  const existingIndex = cart.items.findIndex((item) => item.id === updatedItem.id);
  if (existingIndex >= 0) {
    return {
      ...cart,
      items: cart.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    };
  }
  return {
    ...cart,
    items: [updatedItem, ...cart.items],
  };
}

export function useCartQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getMyCart,
    enabled: options?.enabled,
  });
}

export function useAddCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCartItemPayload) => addMyCartItem(payload),
    onSuccess: (updatedItem: CartItem) => {
      queryClient.setQueryData<Cart | undefined>(CART_QUERY_KEY, (currentCart) => {
        if (!currentCart) return currentCart;
        return updateCartItemList(currentCart, updatedItem);
      });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      updateMyCartItem({ itemId, payload: { quantity } }),
    onSuccess: (updatedItem: CartItem) => {
      queryClient.setQueryData<Cart | undefined>(CART_QUERY_KEY, (currentCart) => {
        if (!currentCart) return currentCart;
        return updateCartItemList(currentCart, updatedItem);
      });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => removeMyCartItem(itemId),
    onSuccess: (_, itemId: number) => {
      queryClient.setQueryData<Cart | undefined>(CART_QUERY_KEY, (currentCart) => {
        if (!currentCart) return currentCart;
        return {
          ...currentCart,
          items: currentCart.items.filter((item) => item.id !== itemId),
        };
      });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearMyCart,
    onSuccess: () => {
      queryClient.setQueryData<Cart | undefined>(CART_QUERY_KEY, (currentCart) => {
        if (!currentCart) return currentCart;
        return { ...currentCart, items: [] };
      });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
