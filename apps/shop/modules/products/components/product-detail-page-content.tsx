'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { SizeSoldOutDiagonalOverlay } from '@/modules/common/components/size-sold-out-diagonal-overlay';
import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import { isLightHex } from '@/modules/common/utils/is-light-hex';
import { buildCategoryHref } from '@/modules/common/utils/shop-routes';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { ProductDescription } from '@/modules/products/components/product-description';
import { ProductDetailGallery } from '@/modules/products/components/product-detail-gallery';
import { ProductDetailReviewSummary } from '@/modules/products/components/product-detail-review-summary';
import { useProductDetailController } from '@/modules/products/hooks/use-product-detail-controller';
import type { ShopProductDetail } from '@/modules/products/types/product-detail';
import type { ShopProductReviewsResult } from '@/modules/products/types/product-reviews';
import { ProductWishlistHeartButton } from '@/modules/wishlist/components/product-wishlist-heart-button';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import { Check, ChevronDown, MinusIcon, PlusIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ProductDetailReviewsSection = dynamic(
  () =>
    import('@/modules/products/components/product-detail-reviews-section').then(
      (module) => module.ProductDetailReviewsSection,
    ),
  { ssr: false },
);

const ProductCardSlider = dynamic(
  () =>
    import('@/modules/common/components/product-card-slider').then(
      (module) => module.ProductCardSlider,
    ),
  { ssr: false },
);

type ProductDetailPageContentProps = {
  product: ShopProductDetail;
  initialPublicReviews: ShopProductReviewsResult;
  suggestedProducts: NewArrivalProduct[];
};

export function ProductDetailPageContent({
  product,
  initialPublicReviews,
  suggestedProducts,
}: ProductDetailPageContentProps): React.JSX.Element {
  const reviewsSectionRef = useRef<HTMLElement | null>(null);
  const suggestedSectionRef = useRef<HTMLElement | null>(null);
  const [shouldRenderReviews, setShouldRenderReviews] = useState(false);
  const [shouldRenderSuggested, setShouldRenderSuggested] = useState(false);
  const preloadedColorImageIdsRef = useRef<Set<number>>(new Set<number>());
  const {
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
    compareAtPriceLabel,
    discountPercentLabel,
    selectedAvailableQty,
    maxQuantity,
    isAddToCartPending,
    handleAddToCart,
    handleBuyNow,
  } = useProductDetailController({ product });
  const selectedColorName = colorOptions.find((color) => color.id === selectedColorId)?.name ?? '—';
  const firstImageByColorId = useMemo(() => {
    const firstImageMap = new Map<number, string>();
    gallerySlides.forEach((slide) => {
      if (slide.colorId === null || firstImageMap.has(slide.colorId)) {
        return;
      }
      const source = coerceHttpImageSrc(slide.url);
      if (!source) {
        return;
      }
      firstImageMap.set(slide.colorId, source);
    });
    return firstImageMap;
  }, [gallerySlides]);
  const preloadColorImage = useCallback(
    (colorId: number): void => {
      if (preloadedColorImageIdsRef.current.has(colorId)) {
        return;
      }
      const source = firstImageByColorId.get(colorId);
      if (!source) {
        return;
      }
      const image = new window.Image();
      image.decoding = 'async';
      image.src = source;
      preloadedColorImageIdsRef.current.add(colorId);
    },
    [firstImageByColorId],
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          if (entry.target === reviewsSectionRef.current) {
            setShouldRenderReviews(true);
            observer.unobserve(entry.target);
            return;
          }
          if (entry.target === suggestedSectionRef.current) {
            setShouldRenderSuggested(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '350px 0px' },
    );
    const reviewsElement = reviewsSectionRef.current;
    if (reviewsElement) {
      observer.observe(reviewsElement);
    }
    const suggestedElement = suggestedSectionRef.current;
    if (suggestedElement) {
      observer.observe(suggestedElement);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <main className="shop-shell-container pb-16 pt-6 md:pt-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={buildCategoryHref({ slug: product.category.slug })}
              className="hover:text-foreground"
            >
              {product.category.name}
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
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-end gap-2">
              <p className="text-2xl font-semibold text-foreground md:text-3xl">
                {displayPriceLabel}
              </p>
              {compareAtPriceLabel ? (
                <p className="text-base text-muted-foreground line-through md:text-lg">
                  {compareAtPriceLabel}
                </p>
              ) : null}
            </div>
            {discountPercentLabel ? (
              <span className=" bg-[#e1692d] px-2 py-0.5 text-sm font-semibold text-white">
                {discountPercentLabel}
              </span>
            ) : null}
          </div>
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
                      onMouseEnter={() => preloadColorImage(color.id)}
                      onFocus={() => preloadColorImage(color.id)}
                      onTouchStart={() => preloadColorImage(color.id)}
                      onClick={() => {
                        preloadColorImage(color.id);
                        setSelectedColorId(color.id);
                      }}
                      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition"
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
              disabled={selectedVariant === null || isAddToCartPending || selectedAvailableQty < 1}
            >
              Thêm vào giỏ
            </PrimaryCtaButton>
            <PrimaryCtaButton
              type="button"
              ctaVariant="outline"
              className="sm:flex-1"
              onClick={() => void handleBuyNow()}
              disabled={selectedVariant === null || isAddToCartPending || selectedAvailableQty < 1}
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
                  'overflow-hidden text-sm leading-relaxed text-muted-foreground transition-[max-height] duration-300',
                  isDescriptionExpanded ? 'max-h-[999px]' : 'max-h-24',
                )}
              >
                <ProductDescription source={product.description} />
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
      <section ref={reviewsSectionRef}>
        {shouldRenderReviews ? (
          <ProductDetailReviewsSection productSlug={product.slug} initial={initialPublicReviews} />
        ) : (
          <div className="h-32" aria-hidden />
        )}
      </section>
      {suggestedProducts.length > 0 ? (
        <section ref={suggestedSectionRef} className="pt-12">
          <h2 className="mb-6 text-xl font-semibold uppercase tracking-wide text-foreground">
            Sản phẩm gợi ý
          </h2>
          {shouldRenderSuggested ? (
            <ProductCardSlider products={suggestedProducts} />
          ) : (
            <div className="h-60" aria-hidden />
          )}
        </section>
      ) : null}
    </main>
  );
}
