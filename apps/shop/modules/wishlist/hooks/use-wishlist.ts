'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import {
  addMyWishlistItem,
  getMyWishlist,
  removeMyWishlistItem,
} from '@/modules/wishlist/api/wishlist';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback, useMemo } from 'react';

export const WISHLIST_QUERY_KEY = ['shop', 'me', 'wishlist'] as const;
const DEFAULT_WISHLIST_PAGE = 1;
const DEFAULT_WISHLIST_LIMIT = 100;

export function useMyWishlistQuery(options?: { enabled?: boolean; page?: number; limit?: number }) {
  const page = options?.page ?? DEFAULT_WISHLIST_PAGE;
  const limit = options?.limit ?? DEFAULT_WISHLIST_LIMIT;
  return useQuery({
    queryKey: [...WISHLIST_QUERY_KEY, page, limit],
    queryFn: () => getMyWishlist({ page, limit }),
    enabled: options?.enabled,
    staleTime: 1000 * 60,
  });
}

export function parseWishlistErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const responseData = axiosError.response?.data;
    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const messageValue = responseData.message;
      if (Array.isArray(messageValue)) {
        return messageValue[0] ?? 'Không thực hiện được.';
      }
      if (typeof messageValue === 'string') {
        return messageValue;
      }
    }
    return error.message;
  }
  return 'Không thực hiện được.';
}

export function useAddWishlistItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => addMyWishlistItem(productId),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}

export function useRemoveWishlistItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => removeMyWishlistItem(productId),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}

export function useWishlistProductToggle(productId: number): {
  isFavorite: boolean;
  toggleFavorite: () => Promise<void>;
  isPending: boolean;
  isAuthenticatedCustomer: boolean;
  isAuthSessionReady: boolean;
} {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const isAuthenticatedCustomer = Boolean(isAuthSessionReady && user);
  const wishlistQuery = useMyWishlistQuery({ enabled: isAuthenticatedCustomer });
  const wishlistItems = wishlistQuery.data?.data ?? [];
  const addMutation = useAddWishlistItemMutation();
  const removeMutation = useRemoveWishlistItemMutation();
  const isFavorite = useMemo(
    () => wishlistItems.some((item) => item.product.id === productId),
    [wishlistItems, productId],
  );
  const isPending = addMutation.isPending || removeMutation.isPending;
  const toggleFavorite = useCallback(async (): Promise<void> => {
    if (isFavorite) {
      await removeMutation.mutateAsync(productId);
      return;
    }
    await addMutation.mutateAsync(productId);
  }, [addMutation, isFavorite, productId, removeMutation]);
  return {
    isFavorite,
    toggleFavorite,
    isPending,
    isAuthenticatedCustomer,
    isAuthSessionReady,
  };
}
