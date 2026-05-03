'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { addMyCartItem } from '@/modules/cart/api/cart';
import { CART_QUERY_KEY } from '@/modules/cart/hooks/use-cart';
import { useGuestCart } from '@/modules/cart/hooks/use-guest-cart';
import { toast } from '@repo/ui/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export function GuestCartSync(): null {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const { items, clearItems } = useGuestCart();
  const isMergingRef = useRef<boolean>(false);
  const mergedUserIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAuthSessionReady || !user || items.length === 0) {
      return;
    }
    if (mergedUserIdRef.current === user.id || isMergingRef.current) {
      return;
    }
    isMergingRef.current = true;
    void (async (): Promise<void> => {
      try {
        for (const item of items) {
          await addMyCartItem({ variantId: item.variantId, quantity: item.quantity });
        }
        clearItems();
        mergedUserIdRef.current = user.id;
        await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      } catch {
        toast.error('Không thể đồng bộ giỏ hàng tạm. Vui lòng thử lại sau.');
      } finally {
        isMergingRef.current = false;
      }
    })();
  }, [clearItems, isAuthSessionReady, items, queryClient, user]);
  return null;
}
