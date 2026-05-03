'use client';

import type { AddCartItemPayload } from '@/modules/cart/types/cart';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type GuestCartItem = {
  variantId: number;
  quantity: number;
};

const GUEST_CART_STORAGE_KEY = 'shop_guest_cart_items';

function readGuestCartItemsFromStorage(): GuestCartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedRaw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!storedRaw) {
      return [];
    }
    const parsed = JSON.parse(storedRaw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry): GuestCartItem | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const variantId = Number((entry as { variantId?: unknown }).variantId);
        const quantity = Number((entry as { quantity?: unknown }).quantity);
        if (!Number.isInteger(variantId) || !Number.isInteger(quantity) || quantity <= 0) {
          return null;
        }
        return { variantId, quantity };
      })
      .filter((entry): entry is GuestCartItem => entry !== null);
  } catch {
    return [];
  }
}

function writeGuestCartItemsToStorage(items: GuestCartItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (items.length === 0) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
}

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  useEffect(() => {
    setItems(readGuestCartItemsFromStorage());
  }, []);
  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== GUEST_CART_STORAGE_KEY) {
        return;
      }
      setItems(readGuestCartItemsFromStorage());
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  const setAndPersistItems = useCallback((nextItems: GuestCartItem[]): void => {
    setItems(nextItems);
    writeGuestCartItemsToStorage(nextItems);
  }, []);
  const addItem = useCallback(
    (payload: AddCartItemPayload): void => {
      setAndPersistItems(
        ((): GuestCartItem[] => {
          const currentItems = readGuestCartItemsFromStorage();
          const matchedItem = currentItems.find((item) => item.variantId === payload.variantId);
          if (!matchedItem) {
            return [...currentItems, payload];
          }
          return currentItems.map((item) =>
            item.variantId === payload.variantId
              ? { ...item, quantity: item.quantity + payload.quantity }
              : item,
          );
        })(),
      );
    },
    [setAndPersistItems],
  );
  const clearItems = useCallback((): void => {
    setAndPersistItems([]);
  }, [setAndPersistItems]);
  const replaceItems = useCallback(
    (nextItems: GuestCartItem[]): void => {
      setAndPersistItems(nextItems);
    },
    [setAndPersistItems],
  );
  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  return {
    items,
    totalQuantity,
    addItem,
    clearItems,
    replaceItems,
  };
}
