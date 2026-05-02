'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { getProductVariantMatrixById } from '@/modules/cart/api/cart';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const EMPTY_PRODUCT_COLORS: ProductListColor[] = [];

type NewArrivalProductItemProps = {
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

export function NewArrivalProductItem({
  product,
  display = 'compact',
}: NewArrivalProductItemProps): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthSessionReady = useAuthSessionReady();
  const addCartItemMutation = useAddCartItemMutation();
  const productPrice = product.minPrice ?? product.maxPrice;
  const productHref = buildProductHref({ id: product.id, slug: product.slug });
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
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColorHexCode, setSelectedColorHexCode] = useState<string>(
    productColorHexCodes[0] ?? '#111111',
  );
  const productVariantsQuery = useQuery({
    queryKey: ['shop', 'products', product.id, 'variants'],
    queryFn: () => getProductVariantMatrixById(product.id),
    enabled: isPickerOpen,
    staleTime: 1000 * 60 * 5,
  });
  const availableVariants = useMemo(
    () => productVariantsQuery.data?.variants ?? [],
    [productVariantsQuery.data?.variants],
  );
  const availableColorOptions = useMemo(() => {
    const sourceVariants = availableVariants.length > 0 ? availableVariants : [];
    if (sourceVariants.length === 0) {
      return productColorHexCodes.map((hexCode) => ({
        name: 'Màu tùy chọn',
        hexCode,
      }));
    }
    return sourceVariants.reduce<{ name: string; hexCode: string }[]>((result, variant) => {
      const hasExisting = result.some((item) => item.hexCode === variant.color.hexCode);
      if (!hasExisting) {
        result.push({ name: variant.color.name, hexCode: variant.color.hexCode });
      }
      return result;
    }, []);
  }, [availableVariants, productColorHexCodes]);
  const selectedVariantByColor = useMemo(
    () => availableVariants.filter((variant) => variant.color.hexCode === selectedColorHexCode),
    [availableVariants, selectedColorHexCode],
  );
  const sizeOptions = useMemo(
    () => [...new Set(selectedVariantByColor.map((variant) => variant.size.label))],
    [selectedVariantByColor],
  );
  const selectedVariant = useMemo<ProductVariantOption | null>(
    () =>
      selectedVariantByColor.find((variant) => variant.size.label === selectedSize) ??
      selectedVariantByColor[0] ??
      null,
    [selectedSize, selectedVariantByColor],
  );
  const openVariantPicker = (): void => {
    if (!isAuthSessionReady) {
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để thêm vào giỏ hàng', {
        position: 'bottom-right',
      });
      router.push('/login');
      return;
    }
    setSelectedColorHexCode(
      selectedListColorEntry?.hexCode ?? productColorHexCodes[0] ?? '#111111',
    );
    setSelectedSize('');
    setPickerOpen(true);
  };
  const handleAddToCart = async (): Promise<void> => {
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
          <PrimaryCtaButton
            ctaVariant="filled"
            isIconOnly
            aria-label="Chọn màu và kích cỡ để thêm giỏ hàng"
            onClick={openVariantPicker}
          >
            <ShoppingBag className="h-2 w-4" />
          </PrimaryCtaButton>
        </div>
      </div>
      <Dialog open={isPickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Chọn màu và kích cỡ</DialogTitle>
            <DialogDescription>{product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Màu sắc</p>
              <div className="flex flex-wrap items-center gap-2">
                {availableColorOptions.map((color) => {
                  const isSelected = selectedColorHexCode === color.hexCode;
                  return (
                    <button
                      key={`${product.id}-${color.hexCode}`}
                      type="button"
                      aria-label={`Chọn màu ${color.name}`}
                      onClick={() => {
                        setSelectedColorHexCode(color.hexCode);
                        setSelectedSize('');
                      }}
                      className={`h-8 w-8 rounded-full border-2 transition ${isSelected ? 'border-foreground' : 'border-border'}`}
                      style={{ backgroundColor: color.hexCode }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Kích cỡ</p>
              <div className="grid grid-cols-4 gap-2">
                {sizeOptions.map((size: string) => {
                  const isSelected = selectedSize === size;
                  return (
                    <Button
                      key={`${product.id}-${size}`}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>
            </div>
            {productVariantsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải biến thể...</p>
            ) : null}
            {productVariantsQuery.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {productVariantsQuery.error instanceof Error
                  ? productVariantsQuery.error.message
                  : 'Không tải được biến thể sản phẩm.'}
              </p>
            ) : null}
            <PrimaryCtaButton
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={
                !selectedVariant || addCartItemMutation.isPending || productVariantsQuery.isLoading
              }
            >
              Thêm vào giỏ hàng
            </PrimaryCtaButton>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
