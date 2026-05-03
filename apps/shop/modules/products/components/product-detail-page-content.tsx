'use client';

import { useAuthSessionReady } from '@/modules/auth/providers/auth-provider';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useAddCartItemMutation } from '@/modules/cart/hooks/use-cart';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ProductCardSlider } from '@/modules/common/components/product-card-slider';
import { SizeSoldOutDiagonalOverlay } from '@/modules/common/components/size-sold-out-diagonal-overlay';
import { getVariantAvailableQuantity } from '@/modules/common/utils/get-variant-available-quantity';
import { isLightHex } from '@/modules/common/utils/is-light-hex';
import { buildCategoryHref } from '@/modules/common/utils/shop-routes';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import {
  ProductDetailGallery,
  type ProductDetailGallerySlide,
} from '@/modules/products/components/product-detail-gallery';
import { ProductDetailReviewSummary } from '@/modules/products/components/product-detail-review-summary';
import { ProductDetailReviewsSection } from '@/modules/products/components/product-detail-reviews-section';
import type {
  ShopProductDetail,
  ShopProductDetailVariant,
} from '@/modules/products/types/product-detail';
import type { ShopProductReviewsResult } from '@/modules/products/types/product-reviews';
import { formatCatalogPriceLabel } from '@/modules/products/utils/format-catalog-price-label';
import { ProductWishlistHeartButton } from '@/modules/wishlist/components/product-wishlist-heart-button';
import { Button } from '@repo/ui/components/ui/button';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { Check, ChevronDown, MinusIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ProductDetailPageContentProps = {
  product: ShopProductDetail;
  initialPublicReviews: ShopProductReviewsResult;
  suggestedProducts: NewArrivalProduct[];
  breadcrumbCategory?: { slug: string; name: string } | null;
};

function buildUniqueColorsFromVariants(
  variants: readonly ShopProductDetailVariant[],
): { id: number; name: string; hexCode: string }[] {
  const seenColorIds = new Set<number>();
  const uniqueColors: { id: number; name: string; hexCode: string }[] = [];
  for (const variant of variants) {
    if (!seenColorIds.has(variant.color.id)) {
      seenColorIds.add(variant.color.id);
      uniqueColors.push(variant.color);
    }
  }
  return uniqueColors;
}

/** Default color + first size for that color (must match post-mount useEffect) so SSR and hydration agree. */
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

function buildGallerySlides(product: ShopProductDetail): ProductDetailGallerySlide[] {
  return product.images.map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.altText ?? product.name,
    colorId: image.colorId,
  }));
}

export function ProductDetailPageContent({
  product,
  initialPublicReviews,
  suggestedProducts,
  breadcrumbCategory = null,
}: ProductDetailPageContentProps): React.JSX.Element {
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
  const gallerySlides = useMemo(() => buildGallerySlides(product), [product]);
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
  const selectedColorName = colorOptions.find((color) => color.id === selectedColorId)?.name ?? '—';
  const resolvedBreadcrumbCategory = breadcrumbCategory ?? product.category;
  return (
    <main className="shop-shell-container pb-16 pt-6 md:pt-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {resolvedBreadcrumbCategory ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={buildCategoryHref({ slug: resolvedBreadcrumbCategory.slug })}
              className="hover:text-foreground"
            >
              {resolvedBreadcrumbCategory.name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
        <div className="min-w-0">
          <ProductDetailGallery slides={gallerySlides} selectedColorId={selectedColorId} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h1 className="text-xl font-semibold uppercase leading-snug tracking-tight text-foreground md:text-2xl">
              {product.name}
            </h1>
            <div className="mt-2 flex w-full flex-wrap items-center gap-x-4 gap-y-2">
              {selectedVariant ? (
                <p className="text-sm text-muted-foreground">SKU: {selectedVariant.sku}</p>
              ) : null}
              <div className="ml-auto shrink-0">
                <ProductDetailReviewSummary
                  reviewCount={initialPublicReviews.reviewCount}
                  averageRating={initialPublicReviews.averageRating}
                />
              </div>
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground md:text-xl">{displayPriceLabel}</p>
          {colorOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Màu sắc:{' '}
                <span className="font-normal text-muted-foreground">{selectedColorName}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => {
                  const isSelected = color.id === selectedColorId;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={`Chọn màu ${color.name}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedColorId(color.id)}
                      className="relative flex h-10 w-10 items-center justify-center rounded-full transition"
                      style={{ backgroundColor: color.hexCode }}
                    >
                      {isSelected ? (
                        <Check
                          className={cn(
                            'h-4 w-4 drop-shadow',
                            isLightHex(color.hexCode)
                              ? 'text-foreground'
                              : 'text-primary-foreground',
                          )}
                          strokeWidth={2.5}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {sizeRowsForColor.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Kích cỡ</p>
              <div className="flex flex-wrap gap-x-3 gap-y-3">
                {sizeRowsForColor.map((row) => {
                  const isSelected = selectedSizeLabel === row.label;
                  const chipClassName =
                    'inline-flex h-10 shrink-0 items-center justify-center wrap-break-word border border-[#E7E8E9] bg-background px-3 text-center text-[10px] font-medium leading-tight tracking-wide uppercase md:px-4 md:text-xs rounded-br-[10px] rounded-bl-none rounded-tl-[10px] rounded-tr-none';
                  if (row.isOutOfStock) {
                    return (
                      <span
                        key={row.label}
                        className={cn(
                          chipClassName,
                          'relative isolate cursor-default select-none overflow-hidden opacity-95',
                        )}
                        aria-label={`Kích cỡ ${row.label} hết hàng`}
                      >
                        <span className="relative z-10 text-muted-foreground">{row.label}</span>
                        <SizeSoldOutDiagonalOverlay />
                      </span>
                    );
                  }
                  return (
                    <button
                      key={row.label}
                      type="button"
                      aria-label={`Chọn kích cỡ ${row.label}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSizeLabel(row.label)}
                      className={cn(
                        chipClassName,
                        'transition',
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                      )}
                    >
                      {row.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Số lượng</p>
            <div className="radius-diagonal-sm inline-flex h-10 items-center overflow-hidden border border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-10 w-10 shrink-0 rounded-none text-muted-foreground"
                disabled={maxQuantity === 0 || quantity <= 1}
                aria-label="Giảm số lượng"
                onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
              >
                <MinusIcon className="size-4" />
              </Button>
              <span className="flex h-10 min-w-10 items-center justify-center text-center text-sm tabular-nums">
                {quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-10 w-10 shrink-0 rounded-none text-muted-foreground"
                disabled={maxQuantity === 0 || quantity >= maxQuantity}
                aria-label="Tăng số lượng"
                onClick={() =>
                  setQuantity((previous) =>
                    maxQuantity <= 0 ? previous : Math.min(maxQuantity, previous + 1),
                  )
                }
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
            {selectedVariant !== null && selectedAvailableQty <= 5 && selectedAvailableQty > 0 ? (
              <p className="text-xs text-muted-foreground">Còn {selectedAvailableQty} sản phẩm.</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryCtaButton
              type="button"
              className="sm:flex-1"
              onClick={() => void handleAddToCart()}
              disabled={
                selectedVariant === null ||
                addCartItemMutation.isPending ||
                selectedAvailableQty < 1
              }
            >
              Thêm vào giỏ
            </PrimaryCtaButton>
            <PrimaryCtaButton
              type="button"
              ctaVariant="outline"
              className="sm:flex-1"
              onClick={() => void handleBuyNow()}
              disabled={
                selectedVariant === null ||
                addCartItemMutation.isPending ||
                selectedAvailableQty < 1
              }
            >
              Mua hàng
            </PrimaryCtaButton>
            <ProductWishlistHeartButton productId={product.id} layout="detail" />
          </div>
          {product.description ? (
            <div className="border-t border-border pt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                Giới thiệu
              </h2>
              <div
                className={cn(
                  'overflow-hidden whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground transition-[max-height] duration-300',
                  isDescriptionExpanded ? 'max-h-[999px]' : 'max-h-24',
                )}
              >
                {product.description}
              </div>
              <div className="relative mt-4 flex items-center justify-center">
                <div className="h-px w-full bg-border" />
                <button
                  type="button"
                  aria-label={isDescriptionExpanded ? 'Thu gọn mô tả' : 'Mở rộng mô tả'}
                  aria-expanded={isDescriptionExpanded}
                  onClick={() => setIsDescriptionExpanded((previous) => !previous)}
                  className="absolute inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isDescriptionExpanded && 'rotate-180',
                    )}
                  />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <ProductDetailReviewsSection productSlug={product.slug} initial={initialPublicReviews} />
      {suggestedProducts.length > 0 ? (
        <section className="pt-12">
          <h2 className="mb-6 text-xl font-semibold uppercase tracking-wide text-foreground">
            Sản phẩm gợi ý
          </h2>
          <ProductCardSlider products={suggestedProducts} />
        </section>
      ) : null}
    </main>
  );
}
