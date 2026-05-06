'use client';

import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useMemo, useState, type ComponentType, type JSX } from 'react';

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

const ProductDetailGalleryDesktopSwiper = dynamic(
  () =>
    import('./product-detail-gallery-desktop-swiper').then(
      (module) => module.ProductDetailGalleryDesktopSwiper,
    ),
  { ssr: false },
) as ComponentType<{ slides: readonly ProductDetailGallerySlide[] }>;

export function ProductDetailGallery({
  slides,
  selectedColorId,
}: ProductDetailGalleryProps): JSX.Element {
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
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

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(min-width: 768px)');
    const syncDesktopViewport = (): void => {
      setIsDesktopViewport(mediaQueryList.matches);
    };
    syncDesktopViewport();
    mediaQueryList.addEventListener('change', syncDesktopViewport);
    return () => {
      mediaQueryList.removeEventListener('change', syncDesktopViewport);
    };
  }, []);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-2/3 w-full min-w-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Sản phẩm này chưa có hình ảnh!.
      </div>
    );
  }

  if (isDesktopViewport) {
    return <ProductDetailGalleryDesktopSwiper slides={displaySlides} />;
  }

  return (
    <div className="w-full min-w-0">
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-muted/20">
        {displaySlides.map((slide, index) => (
          <div
            key={slide.id}
            className="relative aspect-2/3 w-full shrink-0 snap-start bg-muted/10"
          >
            <Image
              src={coerceHttpImageSrc(slide.url) ?? '/images/placeholder.jpg'}
              alt={slide.alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              loading={index === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
