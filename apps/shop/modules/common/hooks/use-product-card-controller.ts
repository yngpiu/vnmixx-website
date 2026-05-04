'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useAddCartItemMutation } from '@/modules/cart/hooks/use-cart';
import type { ProductVariantOption } from '@/modules/cart/types/cart';
import {
  coerceHttpImageSrc,
  resolveListingImageSrc,
} from '@/modules/common/utils/coerce-http-image-src';
import { getVariantAvailableQuantity } from '@/modules/common/utils/get-variant-available-quantity';
import type { NewArrivalProduct, ProductListColor } from '@/modules/home/types/new-arrival-product';
import { toast } from '@repo/ui/components/ui/sonner';
import { useEffect, useMemo, useState } from 'react';

const EMPTY_PRODUCT_COLORS: ProductListColor[] = [];

type SizePickerRow = {
  label: string;
  isOutOfStock: boolean;
};

type UseProductCardControllerReturn = {
  listColors: ProductListColor[];
  selectedListColorId: number | null;
  setSelectedListColorId: (value: number) => void;
  setListingImageHovered: (value: boolean) => void;
  showListingAlternateImage: boolean;
  listingPrimarySrc: string;
  listingSecondarySrc: string | null;
  isPickerOpen: boolean;
  setPickerOpen: (value: boolean) => void;
  sizePickerRows: SizePickerRow[];
  openVariantPicker: () => void;
  handleSelectSize: (size: string) => Promise<void>;
  isAddCartPending: boolean;
};

export function useProductCardController(
  product: NewArrivalProduct,
): UseProductCardControllerReturn {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const addCartItemMutation = useAddCartItemMutation();
  const listColors: ProductListColor[] = product.colors?.length
    ? product.colors
    : EMPTY_PRODUCT_COLORS;
  const productColorHexCodes = useMemo(
    () => (listColors.length > 0 ? listColors.map((color) => color.hexCode) : ['#111111']),
    [listColors],
  );
  const [selectedListColorId, setSelectedListColorId] = useState<number | null>(
    listColors[0]?.id ?? null,
  );
  const [isListingImageHovered, setListingImageHovered] = useState<boolean>(false);
  useEffect(() => {
    const colors = product.colors?.length ? product.colors : EMPTY_PRODUCT_COLORS;
    const fallbackId = colors[0]?.id ?? null;
    setSelectedListColorId((previous) => {
      if (previous != null && colors.some((color) => color.id === previous)) {
        return previous;
      }
      return fallbackId;
    });
  }, [product.id, product.colors]);
  useEffect(() => {
    setListingImageHovered(false);
  }, [selectedListColorId]);
  const selectedListColorEntry = useMemo(
    () => listColors.find((color) => color.id === selectedListColorId) ?? listColors[0] ?? null,
    [listColors, selectedListColorId],
  );
  const listingPrimarySrc = resolveListingImageSrc(selectedListColorEntry?.frontUrl);
  const listingSecondarySrc = coerceHttpImageSrc(selectedListColorEntry?.backUrl);
  const showListingAlternateImage =
    isListingImageHovered &&
    listingSecondarySrc != null &&
    listingSecondarySrc !== listingPrimarySrc;
  const [isPickerOpen, setPickerOpen] = useState<boolean>(false);
  const [selectedColorHexCode, setSelectedColorHexCode] = useState<string>(
    productColorHexCodes[0] ?? '#111111',
  );
  const availableVariants = useMemo<ProductVariantOption[]>(
    () => (product.variants ?? []).map((variant) => ({ ...variant })),
    [product.variants],
  );
  const selectedVariantByColor = useMemo(
    () => availableVariants.filter((variant) => variant.color.hexCode === selectedColorHexCode),
    [availableVariants, selectedColorHexCode],
  );
  const sizePickerRows = useMemo(() => {
    const source = selectedVariantByColor.length > 0 ? selectedVariantByColor : availableVariants;
    const byLabel = new Map<string, ProductVariantOption>();
    for (const variant of source) {
      const label = variant.size.label;
      if (!byLabel.has(label)) {
        byLabel.set(label, variant);
      }
    }
    return Array.from(byLabel.values())
      .sort((left, right) => left.size.sortOrder - right.size.sortOrder)
      .map((variant) => ({
        label: variant.size.label,
        isOutOfStock: getVariantAvailableQuantity(variant) <= 0,
      }));
  }, [availableVariants, selectedVariantByColor]);
  const openVariantPicker = (): void => {
    setSelectedColorHexCode(
      selectedListColorEntry?.hexCode ?? productColorHexCodes[0] ?? '#111111',
    );
    setPickerOpen(true);
  };
  const handleSelectSize = async (size: string): Promise<void> => {
    if (!isAuthSessionReady) {
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để thêm vào giỏ hàng', {
        position: 'bottom-right',
      });
      return;
    }
    const selectedVariant: ProductVariantOption | null =
      selectedVariantByColor.find((variant) => variant.size.label === size) ??
      availableVariants.find((variant) => variant.size.label === size) ??
      null;
    if (!selectedVariant) {
      toast.error('Không tìm thấy biến thể phù hợp.', { position: 'bottom-right' });
      return;
    }
    if (getVariantAvailableQuantity(selectedVariant) <= 0) {
      return;
    }
    try {
      await addCartItemMutation.mutateAsync({
        variantId: selectedVariant.id,
        quantity: 1,
      });
      setPickerOpen(false);
      toast.success('Đã thêm sản phẩm vào giỏ hàng', { position: 'bottom-right' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.', {
        position: 'bottom-right',
      });
    }
  };
  return {
    listColors,
    selectedListColorId,
    setSelectedListColorId,
    setListingImageHovered,
    showListingAlternateImage,
    listingPrimarySrc,
    listingSecondarySrc,
    isPickerOpen,
    setPickerOpen,
    sizePickerRows,
    openVariantPicker,
    handleSelectSize,
    isAddCartPending: addCartItemMutation.isPending,
  };
}
