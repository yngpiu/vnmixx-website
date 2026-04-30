'use client';

import { calculateShippingFee, placeMyOrder } from '@/modules/cart/api/checkout';
import type {
  CalculateShippingFeePayload,
  PlaceOrderPayload,
  ShippingFeeResult,
} from '@/modules/cart/types/checkout';
import { useMutation, useQuery } from '@tanstack/react-query';

export function useShippingFeeQuery(payload: CalculateShippingFeePayload | null, enabled: boolean) {
  return useQuery<ShippingFeeResult>({
    queryKey: ['shop', 'shipping', 'fee', payload?.addressId],
    queryFn: () => calculateShippingFee({ addressId: payload?.addressId ?? 0 }),
    enabled: enabled && Boolean(payload?.addressId),
  });
}

export function usePlaceOrderMutation() {
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) => placeMyOrder(payload),
  });
}
