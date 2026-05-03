'use client';

import { getMyCustomerAddresses } from '@/modules/account/api/addresses';
import type { CustomerAddress } from '@/modules/account/types/address';
import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useCartQuery } from '@/modules/cart/hooks/use-cart';
import { usePlaceOrderMutation, useShippingFeeQuery } from '@/modules/cart/hooks/use-checkout';
import type { CartItem } from '@/modules/cart/types/cart';
import type { CheckoutPaymentMethod } from '@/modules/cart/types/checkout';
import { toast } from '@repo/ui/components/ui/sonner';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function getItemTotal(item: CartItem): number {
  return item.variant.price * item.quantity;
}

type UseCheckoutPageControllerReturn = {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAuthSessionReady: boolean;
  selectedAddressId: number | null;
  paymentMethod: CheckoutPaymentMethod;
  isAddressDialogOpen: boolean;
  setIsAddressDialogOpen: (value: boolean) => void;
  setPaymentMethod: (value: CheckoutPaymentMethod) => void;
  setSelectedAddressId: (value: number) => void;
  cartQuery: ReturnType<typeof useCartQuery>;
  addressesQuery: ReturnType<typeof useQuery<CustomerAddress[]>>;
  shippingFeeQuery: ReturnType<typeof useShippingFeeQuery>;
  placeOrderMutation: ReturnType<typeof usePlaceOrderMutation>;
  items: CartItem[];
  addresses: CustomerAddress[];
  selectedAddress: CustomerAddress | null;
  subtotal: number;
  totalQuantity: number;
  shippingFee: number;
  grandTotal: number;
  selectedService: { total: number; leadtime?: string } | null;
  handlePlaceOrder: () => Promise<void>;
};

export function useCheckoutPageController(): UseCheckoutPageControllerReturn {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('COD');
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState<boolean>(false);
  const cartQuery = useCartQuery({ enabled: Boolean(user) });
  const addressesQuery = useQuery({
    queryKey: ['shop', 'me', 'addresses'],
    queryFn: getMyCustomerAddresses,
    enabled: Boolean(user),
  });
  const shippingFeeQuery = useShippingFeeQuery(
    selectedAddressId ? { addressId: selectedAddressId } : null,
    Boolean(user),
  );
  const placeOrderMutation = usePlaceOrderMutation();
  const items = cartQuery.data?.items ?? [];
  const addresses = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const subtotal = items.reduce((total, item) => total + getItemTotal(item), 0);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const selectedService = useMemo(() => {
    const services = shippingFeeQuery.data?.services ?? [];
    if (services.length === 0) {
      return null;
    }
    return services[0] ?? null;
  }, [shippingFeeQuery.data?.services]);
  const shippingFee = selectedService?.total ?? 0;
  const grandTotal = subtotal + shippingFee;
  useEffect(() => {
    if (!isAuthSessionReady || !user || selectedAddressId !== null || addresses.length === 0) {
      return;
    }
    const defaultAddress = addresses.find((address) => address.isDefault) ?? null;
    if (!defaultAddress) {
      return;
    }
    setSelectedAddressId(defaultAddress.id);
  }, [addresses, isAuthSessionReady, selectedAddressId, user]);
  const handlePlaceOrder = async (): Promise<void> => {
    if (!selectedAddressId) {
      toast.error('Vui lòng chọn địa chỉ giao hàng.');
      return;
    }
    if (!selectedService) {
      toast.error('Không thể tính phí vận chuyển. Vui lòng kiểm tra lại địa chỉ.');
      return;
    }
    try {
      const order = await placeOrderMutation.mutateAsync({
        addressId: selectedAddressId,
        paymentMethod,
        requiredNote: 'KHONGCHOXEMHANG',
      });
      if (paymentMethod === 'BANK_TRANSFER_QR') {
        router.push(`/checkout/payment?orderCode=${encodeURIComponent(order.orderCode)}`);
        return;
      }
      router.push(`/checkout/complete?orderCode=${encodeURIComponent(order.orderCode)}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể đặt hàng lúc này.');
    }
  };
  return {
    user,
    isAuthSessionReady,
    selectedAddressId,
    paymentMethod,
    isAddressDialogOpen,
    setIsAddressDialogOpen,
    setPaymentMethod,
    setSelectedAddressId,
    cartQuery,
    addressesQuery,
    shippingFeeQuery,
    placeOrderMutation,
    items,
    addresses,
    selectedAddress,
    subtotal,
    totalQuantity,
    shippingFee,
    grandTotal,
    selectedService,
    handlePlaceOrder,
  };
}
