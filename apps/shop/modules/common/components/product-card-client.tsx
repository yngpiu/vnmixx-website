'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { SizeSoldOutDiagonalOverlay } from '@/modules/common/components/size-sold-out-diagonal-overlay';
import { useProductCardController } from '@/modules/common/hooks/use-product-card-controller';
import { isLightHex } from '@/modules/common/utils/is-light-hex';
import { buildProductHref } from '@/modules/common/utils/shop-routes';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import { formatCatalogPriceLabelNullable } from '@/modules/products/utils/format-catalog-price-label';
import { ProductWishlistHeartButton } from '@/modules/wishlist/components/product-wishlist-heart-button';
import { Button } from '@repo/ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';
import { Check, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

export type ProductCardProps = {
  product: NewArrivalProduct;
  /** Category listing typography; defaults to homepage card. */
  display?: 'compact' | 'listing';
  productHrefOverride?: string;
};

export function ProductCardClient({
  product,
  display = 'compact',
  productHrefOverride,
}: ProductCardProps): React.JSX.Element {
  const productPrice = product.minPrice ?? product.maxPrice;
  const productHref = productHrefOverride ?? buildProductHref({ slug: product.slug });
  const {
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
    isAddCartPending,
  } = useProductCardController(product);

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
                      className={cn(
                        'size-3',
                        isLightHex(color.hexCode) ? 'text-foreground' : 'text-primary-foreground',
                      )}
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
            {formatCatalogPriceLabelNullable(productPrice)}
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
                  {sizePickerRows.map((row) =>
                    row.isOutOfStock ? (
                      <span
                        key={`${product.id}-${row.label}`}
                        className="relative isolate flex h-[clamp(28px,7vw,32px)] cursor-default select-none items-center justify-center overflow-hidden rounded-none px-0 text-[clamp(14px,4.2vw,16px)] font-medium"
                        aria-label={`Kích cỡ ${row.label} hết hàng`}
                      >
                        <span className="relative z-10 text-muted-foreground">{row.label}</span>
                        <SizeSoldOutDiagonalOverlay roundedClass="rounded-none" />
                      </span>
                    ) : (
                      <Button
                        key={`${product.id}-${row.label}`}
                        type="button"
                        variant="ghost"
                        className="h-[clamp(28px,7vw,32px)] justify-center rounded-none px-0 text-[clamp(14px,4.2vw,16px)] font-medium text-foreground hover:bg-muted/30"
                        disabled={isAddCartPending}
                        onClick={() => void handleSelectSize(row.label)}
                      >
                        {row.label}
                      </Button>
                    ),
                  )}
                </div>
                {sizePickerRows.length === 0 ? (
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
