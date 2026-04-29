'use client';

import {
  CART_QUERY_KEY,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/modules/cart/hooks/use-cart';
import type { Cart } from '@/modules/cart/types/cart';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const QUANTITY_UPDATE_DEBOUNCE_MS = 350;

export function useDebouncedCartQuantityUpdate() {
  const queryClient = useQueryClient();
  const updateCartItemMutation = useUpdateCartItemMutation();
  const removeCartItemMutation = useRemoveCartItemMutation();
  const pendingTimeoutByItemRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingQuantityByItemRef = useRef<Map<number, number>>(new Map());
  const scheduleQuantityUpdate = (itemId: number, quantity: number): void => {
    const normalizedQuantity = Math.max(0, quantity);
    queryClient.setQueryData<Cart | undefined>(CART_QUERY_KEY, (currentCart) => {
      if (!currentCart) return currentCart;
      if (normalizedQuantity === 0) {
        return {
          ...currentCart,
          items: currentCart.items.filter((item) => item.id !== itemId),
        };
      }
      return {
        ...currentCart,
        items: currentCart.items.map((item) =>
          item.id === itemId ? { ...item, quantity: normalizedQuantity } : item,
        ),
      };
    });
    const existingTimeout = pendingTimeoutByItemRef.current.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    pendingQuantityByItemRef.current.set(itemId, normalizedQuantity);
    const nextTimeout = setTimeout(() => {
      const finalQuantity = pendingQuantityByItemRef.current.get(itemId);
      pendingTimeoutByItemRef.current.delete(itemId);
      pendingQuantityByItemRef.current.delete(itemId);
      if (finalQuantity === undefined) return;
      if (finalQuantity === 0) {
        removeCartItemMutation.mutate(itemId, {
          onError: () => {
            void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          },
        });
        return;
      }
      updateCartItemMutation.mutate(
        { itemId, quantity: finalQuantity },
        {
          onError: () => {
            void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
          },
        },
      );
    }, QUANTITY_UPDATE_DEBOUNCE_MS);
    pendingTimeoutByItemRef.current.set(itemId, nextTimeout);
  };
  const removeCartItemImmediately = (itemId: number): void => {
    const existingTimeout = pendingTimeoutByItemRef.current.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pendingTimeoutByItemRef.current.delete(itemId);
    }
    pendingQuantityByItemRef.current.delete(itemId);
    removeCartItemMutation.mutate(itemId, {
      onError: () => {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      },
    });
  };
  useEffect(() => {
    return () => {
      pendingTimeoutByItemRef.current.forEach((timeout) => clearTimeout(timeout));
      pendingTimeoutByItemRef.current.clear();
      pendingQuantityByItemRef.current.clear();
    };
  }, []);
  return {
    scheduleQuantityUpdate,
    removeCartItemImmediately,
    isSavingQuantity: updateCartItemMutation.isPending || removeCartItemMutation.isPending,
  };
}
