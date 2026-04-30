'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type JSX } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import { FreeMode, Navigation, Pagination, Thumbs } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

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

/**
 * Maps each color to the index of its first gallery slide (API image order).
 */
function buildFirstSlideIndexByColorId(
  gallerySlides: readonly ProductDetailGallerySlide[],
): Map<number, number> {
  const firstIndexByColorId = new Map<number, number>();
  gallerySlides.forEach((slide, index) => {
    if (slide.colorId !== null && !firstIndexByColorId.has(slide.colorId)) {
      firstIndexByColorId.set(slide.colorId, index);
    }
  });
  return firstIndexByColorId;
}

export function ProductDetailGallery({
  slides,
  selectedColorId,
}: ProductDetailGalleryProps): JSX.Element {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const firstSlideIndexByColorId = useMemo(() => buildFirstSlideIndexByColorId(slides), [slides]);
  const [initialMainSlideIndex] = useState(
    () => buildFirstSlideIndexByColorId(slides).get(selectedColorId) ?? 0,
  );
  const slideMainToColor = useCallback(
    (colorId: number): void => {
      if (!mainSwiper) {
        return;
      }
      const targetIndex = firstSlideIndexByColorId.get(colorId) ?? 0;
      mainSwiper.slideTo(targetIndex);
    },
    [firstSlideIndexByColorId, mainSwiper],
  );
  useEffect(() => {
    if (!mainSwiper) {
      return;
    }
    slideMainToColor(selectedColorId);
  }, [mainSwiper, selectedColorId, slideMainToColor]);
  const thumbsSwiperParam =
    thumbsSwiper && !(thumbsSwiper as unknown as { destroyed?: boolean }).destroyed
      ? thumbsSwiper
      : undefined;
  if (slides.length === 0) {
    return (
      <div className="flex aspect-2/3 w-full min-w-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Sản phẩm này chưa có hình ảnh!.
      </div>
    );
  }
  const hasMultipleSlides: boolean = slides.length > 1;
  const mainSwiperStyle = {
    '--swiper-navigation-color': 'var(--muted)',
    '--swiper-pagination-color': 'var(--foreground)',
    '--swiper-pagination-bullet-inactive-color': 'var(--muted-foreground)',
    '--swiper-pagination-bullet-inactive-opacity': '0.45',
    '--swiper-pagination-bullet-opacity': '1',
  } as CSSProperties;
  const thumbsSwiperStyle = {
    '--swiper-navigation-color': 'var(--muted)',
  } as CSSProperties;
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 max-md:gap-4 md:flex-row md:items-stretch md:gap-3">
      <div className="relative min-w-0 w-full md:flex-1">
        <Swiper
          modules={[Navigation, Thumbs, Pagination]}
          direction="horizontal"
          navigation={hasMultipleSlides}
          pagination={
            hasMultipleSlides ? { clickable: true, dynamicBullets: slides.length > 6 } : false
          }
          initialSlide={initialMainSlideIndex}
          thumbs={{ swiper: thumbsSwiperParam }}
          spaceBetween={0}
          style={mainSwiperStyle}
          className="product-detail-main-swiper aspect-2/3 w-full bg-muted/20 [&_.swiper-button-next]:hidden [&_.swiper-button-prev]:hidden md:[&_.swiper-button-next]:flex md:[&_.swiper-button-prev]:flex [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75 [&_.swiper-pagination]:mt-3 [&_.swiper-pagination]:md:hidden [&_.swiper-pagination-bullet]:border [&_.swiper-pagination-bullet]:border-muted-foreground/40"
          onSwiper={setMainSwiper}
        >
          {slides.map((slide) => (
            <SwiperSlide
              key={slide.id}
              className="flex! h-full items-center justify-center bg-muted/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt={slide.alt}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="relative w-full max-md:min-h-0 shrink-0 md:w-20 md:shrink-0 lg:w-24">
        <Swiper
          modules={[Thumbs, FreeMode, Navigation]}
          onSwiper={setThumbsSwiper}
          direction="horizontal"
          navigation={hasMultipleSlides}
          freeMode={{ enabled: true, minimumVelocity: 0.02 }}
          breakpoints={{
            768: {
              direction: 'vertical',
              freeMode: false,
            },
          }}
          spaceBetween={8}
          slidesPerView="auto"
          watchSlidesProgress
          watchOverflow
          style={thumbsSwiperStyle}
          className="product-detail-thumbs-swiper h-[112px] min-h-0 touch-pan-x md:h-full md:touch-auto [&_.swiper-button-next]:hidden [&_.swiper-button-prev]:hidden md:[&_.swiper-button-next]:flex md:[&_.swiper-button-prev]:flex [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75"
        >
          {slides.map((slide) => (
            <SwiperSlide
              key={`thumb-${slide.id}`}
              className="aspect-2/3! h-auto! w-[72px]! shrink-0 cursor-pointer overflow-hidden border border-transparent opacity-70 transition md:w-full! [&.swiper-slide-thumb-active]:border-foreground [&.swiper-slide-thumb-active]:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
