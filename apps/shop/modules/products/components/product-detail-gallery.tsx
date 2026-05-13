'use client';

import { ProductDetailGalleryDesktopSwiper } from '@/modules/products/components/product-detail-gallery-desktop-swiper';
import { useMemo, type JSX } from 'react';

export type ProductDetailGallerySlide = {
  id: number;
  url: string;
  alt: string;
  colorId: number | null;
};

type ProductDetailGalleryProps = {
  slides: readonly ProductDetailGallerySlide[];
  selectedColorId: number;
};

export function ProductDetailGallery({
  slides,
  selectedColorId,
}: ProductDetailGalleryProps): JSX.Element {
  const displaySlides = useMemo(() => {
    const selectedColorSlides = slides.filter((slide) => slide.colorId === selectedColorId);
    if (selectedColorSlides.length > 0) {
      return selectedColorSlides;
    }
    const sharedSlides = slides.filter((slide) => slide.colorId === null);
    if (sharedSlides.length > 0) {
      return sharedSlides;
    }
    return slides;
  }, [selectedColorId, slides]);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-2/3 w-full min-w-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Sản phẩm này chưa có hình ảnh!.
      </div>
    );
  }

  return <ProductDetailGalleryDesktopSwiper slides={displaySlides} />;
}
