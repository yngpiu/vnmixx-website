'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useAddCartItemMutation } from '@/modules/cart/hooks/use-cart';
import { getVariantAvailableQuantity } from '@/modules/common/utils/get-variant-available-quantity';
import type {
  ShopProductDetail,
  ShopProductDetailVariant,
} from '@/modules/products/types/product-detail';
import { formatCatalogPriceLabel } from '@/modules/products/utils/format-catalog-price-label';
import { toast } from '@repo/ui/components/ui/sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ProductDetailColor = { id: number; name: string; hexCode: string };

type SizeRow = {
  label: string;
  isOutOfStock: boolean;
};

type UseProductDetailControllerParams = {
  product: ShopProductDetail;
};

type UseProductDetailControllerReturn = {
  colorOptions: ProductDetailColor[];
  selectedColorId: number;
  setSelectedColorId: (value: number) => void;
  selectedSizeLabel: string;
  setSelectedSizeLabel: (value: string) => void;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  gallerySlides: { id: number; url: string; alt: string; colorId: number | null }[];
  sizeRowsForColor: SizeRow[];
  selectedVariant: ShopProductDetailVariant | null;
  displayPriceLabel: string;
  selectedAvailableQty: number;
  maxQuantity: number;
  isAddToCartPending: boolean;
  handleAddToCart: () => Promise<void>;
  handleBuyNow: () => Promise<void>;
};

function buildUniqueColorsFromVariants(
  variants: readonly ShopProductDetailVariant[],
): ProductDetailColor[] {
  const seenColorIds = new Set<number>();
  const uniqueColors: ProductDetailColor[] = [];
  for (const variant of variants) {
    if (!seenColorIds.has(variant.color.id)) {
      seenColorIds.add(variant.color.id);
      uniqueColors.push(variant.color);
    }
  }
  return uniqueColors;
}

function getInitialColorAndSizeLabel(product: ShopProductDetail): {
  colorId: number;
  sizeLabel: string;
} {
  const colorId = buildUniqueColorsFromVariants(product.variants)[0]?.id ?? 0;
  const variantsForColor = product.variants
    .filter((variant) => variant.color.id === colorId)
    .sort((a, b) => a.size.sortOrder - b.size.sortOrder);
  const byLabel = new Map<string, ShopProductDetailVariant>();
  for (const variant of variantsForColor) {
    if (!byLabel.has(variant.size.label)) {
      byLabel.set(variant.size.label, variant);
    }
  }
  const rows = [...byLabel.values()].sort((a, b) => a.size.sortOrder - b.size.sortOrder);
  const firstInStock = rows.find((v) => getVariantAvailableQuantity(v) > 0);
  const sizeLabel = firstInStock?.size.label ?? '';
  return { colorId, sizeLabel };
}

export function useProductDetailController({
  product,
}: UseProductDetailControllerParams): UseProductDetailControllerReturn {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const addCartItemMutation = useAddCartItemMutation();
  const colorOptions = useMemo(
    () => buildUniqueColorsFromVariants(product.variants),
    [product.variants],
  );
  const [selectedColorId, setSelectedColorId] = useState<number>(
    () => getInitialColorAndSizeLabel(product).colorId,
  );
  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string>(
    () => getInitialColorAndSizeLabel(product).sizeLabel,
  );
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const gallerySlides = useMemo(
    () =>
      product.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.altText ?? product.name,
        colorId: image.colorId,
      })),
    [product],
  );
  const sizeRowsForColor = useMemo(() => {
    const sortedVariants = product.variants
      .filter((variant) => variant.color.id === selectedColorId)
      .sort((a, b) => a.size.sortOrder - b.size.sortOrder);
    const byLabel = new Map<string, ShopProductDetailVariant>();
    for (const variant of sortedVariants) {
      if (!byLabel.has(variant.size.label)) {
        byLabel.set(variant.size.label, variant);
      }
    }
    return [...byLabel.values()]
      .sort((a, b) => a.size.sortOrder - b.size.sortOrder)
      .map((variant) => ({
        label: variant.size.label,
        isOutOfStock: getVariantAvailableQuantity(variant) <= 0,
      }));
  }, [product.variants, selectedColorId]);
  useEffect(() => {
    const firstInStock = sizeRowsForColor.find((row) => !row.isOutOfStock);
    setSelectedSizeLabel(firstInStock?.label ?? '');
    setQuantity(1);
  }, [selectedColorId, sizeRowsForColor]);
  const selectedVariant = useMemo<ShopProductDetailVariant | null>(() => {
    if (!selectedSizeLabel) {
      return null;
    }
    return (
      product.variants.find(
        (variant) =>
          variant.color.id === selectedColorId && variant.size.label === selectedSizeLabel,
      ) ?? null
    );
  }, [product.variants, selectedColorId, selectedSizeLabel]);
  const priceRangeLabel = useMemo(() => {
    if (product.variants.length === 0) {
      return 'Liên hệ';
    }
    const prices = product.variants.map((variant) => variant.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      return formatCatalogPriceLabel(minPrice);
    }
    return `${formatCatalogPriceLabel(minPrice)} – ${formatCatalogPriceLabel(maxPrice)}`;
  }, [product.variants]);
  const displayPriceLabel =
    selectedVariant !== null ? formatCatalogPriceLabel(selectedVariant.price) : priceRangeLabel;
  const selectedAvailableQty =
    selectedVariant !== null ? getVariantAvailableQuantity(selectedVariant) : 0;
  const maxQuantity = selectedAvailableQty <= 0 ? 0 : selectedAvailableQty;
  const requireLoginForCart = (): boolean => {
    if (!isAuthSessionReady) {
      return true;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để thêm vào giỏ hàng', { position: 'bottom-right' });
      router.push('/login');
      return true;
    }
    return false;
  };
  const executeAddToCart = async (): Promise<boolean> => {
    if (!selectedVariant) {
      toast.error('Vui lòng chọn màu và kích cỡ.', { position: 'bottom-right' });
      return false;
    }
    if (getVariantAvailableQuantity(selectedVariant) < 1) {
      return false;
    }
    try {
      await addCartItemMutation.mutateAsync({
        variantId: selectedVariant.id,
        quantity,
      });
      toast.success('Đã thêm sản phẩm vào giỏ hàng', { position: 'bottom-right' });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng.', {
        position: 'bottom-right',
      });
      return false;
    }
  };
  const handleAddToCart = async (): Promise<void> => {
    if (requireLoginForCart()) {
      return;
    }
    await executeAddToCart();
  };
  const handleBuyNow = async (): Promise<void> => {
    if (requireLoginForCart()) {
      return;
    }
    const okResult = await executeAddToCart();
    if (okResult) {
      router.push('/gio-hang');
    }
  };
  return {
    colorOptions,
    selectedColorId,
    setSelectedColorId,
    selectedSizeLabel,
    setSelectedSizeLabel,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    quantity,
    setQuantity,
    gallerySlides,
    sizeRowsForColor,
    selectedVariant,
    displayPriceLabel,
    selectedAvailableQty,
    maxQuantity,
    isAddToCartPending: addCartItemMutation.isPending,
    handleAddToCart,
    handleBuyNow,
  };
}
