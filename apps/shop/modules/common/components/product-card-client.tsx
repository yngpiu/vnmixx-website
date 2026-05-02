'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useAddCartItemMutation } from '@/modules/cart/hooks/use-cart';
import type { ProductVariantOption } from '@/modules/cart/types/cart';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import {
  coerceHttpImageSrc,
  resolveListingImageSrc,
} from '@/modules/common/utils/coerce-http-image-src';
import { buildProductHref } from '@/modules/common/utils/shop-routes';
import type { NewArrivalProduct, ProductListColor } from '@/modules/home/types/new-arrival-product';
import { ProductWishlistHeartButton } from '@/modules/wishlist/components/product-wishlist-heart-button';
import { Button } from '@repo/ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { Check, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const EMPTY_PRODUCT_COLORS: ProductListColor[] = [];

export type ProductCardProps = {
  product: NewArrivalProduct;
  /** Category listing typography; defaults to homepage card. */
  display?: 'compact' | 'listing';
};

const moneyFormatter = new Intl.NumberFormat('vi-VN');

function formatMoney(value: number | null): string {
  if (value === null) {
    return 'Liên hệ';
  }
  return `${moneyFormatter.format(value)}đ`;
}

export function ProductCardClient({
  product,
  display = 'compact',
}: ProductCardProps): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const addCartItemMutation = useAddCartItemMutation();
  const productPrice = product.minPrice ?? product.maxPrice;
  const productHref = buildProductHref({ slug: product.slug });
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
  const [isListingImageHovered, setListingImageHovered] = useState(false);
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
  const sizeOptions = useMemo(
    () => [
      ...new Set(
        (selectedVariantByColor.length > 0 ? selectedVariantByColor : availableVariants).map(
          (variant) => variant.size.label,
        ),
      ),
    ],
    [availableVariants, selectedVariantByColor],
  );
  const openVariantPicker = (): void => {
    if (!isAuthSessionReady) {
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để thêm vào giỏ hàng', {
        position: 'bottom-right',
      });
      return;
    }
    setSelectedColorHexCode(
      selectedListColorEntry?.hexCode ?? productColorHexCodes[0] ?? '#111111',
    );
    setPickerOpen(true);
  };
  const handleSelectSize = async (size: string): Promise<void> => {
    const selectedVariant: ProductVariantOption | null =
      selectedVariantByColor.find((variant) => variant.size.label === size) ??
      availableVariants.find((variant) => variant.size.label === size) ??
      null;
    if (!selectedVariant) {
      toast.error('Không tìm thấy biến thể phù hợp.', { position: 'bottom-right' });
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

  return (
    <article className="group">
      <Link href={productHref} className="block">
        <div className="overflow-hidden bg-muted/20">
          <div
            className="relative aspect-3/4 w-full"
            onMouseEnter={() => setListingImageHovered(true)}
            onMouseLeave={() => setListingImageHovered(false)}
          >
            <Image
              src={listingPrimarySrc}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
              className={cn(
                'pointer-events-none object-cover transition duration-300 group-hover:scale-[1.02]',
                showListingAlternateImage ? 'opacity-0' : 'opacity-100',
              )}
            />
            {listingSecondarySrc ? (
              <Image
                src={listingSecondarySrc}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                className={cn(
                  'pointer-events-none absolute inset-0 object-cover transition-opacity duration-300 group-hover:scale-[1.02]',
                  showListingAlternateImage ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
            ) : null}
          </div>
        </div>
      </Link>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {listColors.map((color) => {
              const isSelectedColor = selectedListColorId === color.id;
              return (
                <button
                  key={`${product.id}-${color.id}`}
                  type="button"
                  aria-label={`Hiển thị ảnh màu ${color.name}`}
                  aria-pressed={isSelectedColor}
                  className="relative flex size-[17px] shrink-0 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: color.hexCode }}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    setSelectedListColorId(color.id);
                  }}
                >
                  {isSelectedColor ? (
                    <Check
                      aria-hidden
                      className="size-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,1)]"
                      strokeWidth={2.75}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <ProductWishlistHeartButton productId={product.id} layout="card" />
        </div>
        <Link href={productHref} className="block">
          <h3
            className={
              display === 'listing'
                ? 'line-clamp-2 min-h-10 text-sm leading-snug text-foreground md:text-[15px]'
                : 'line-clamp-2 min-h-10 text-sm text-foreground'
            }
          >
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-semibold text-foreground ${display === 'listing' ? 'text-[15px] md:text-base' : 'text-base'}`}
          >
            {formatMoney(productPrice)}
          </span>
          <Popover open={isPickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <PrimaryCtaButton
                ctaVariant="filled"
                isIconOnly
                className="h-7! w-7! md:h-8! md:w-8!"
                aria-label="Chọn kích cỡ để thêm giỏ hàng"
                onClick={openVariantPicker}
              >
                <ShoppingBag className="size-3.5" />
              </PrimaryCtaButton>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="top"
              sideOffset={8}
              className="w-[clamp(92px,24vw,118px)] rounded-none border border-[#E7E8E9] bg-white p-0 shadow-none"
            >
              <div className="space-y-1 p-[clamp(6px,1.8vw,10px)]">
                <div className="grid grid-cols-1 gap-2">
                  {sizeOptions.map((size: string) => (
                    <Button
                      key={`${product.id}-${size}`}
                      type="button"
                      variant="ghost"
                      className="h-[clamp(28px,7vw,32px)] justify-center rounded-none px-0 text-[clamp(14px,4.2vw,16px)] font-medium text-foreground hover:bg-muted/30"
                      disabled={addCartItemMutation.isPending}
                      onClick={() => void handleSelectSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
                {sizeOptions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Sản phẩm chưa có biến thể khả dụng.
                  </p>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </article>
  );
}
