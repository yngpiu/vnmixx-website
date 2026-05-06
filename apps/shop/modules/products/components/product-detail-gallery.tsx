'use client';

import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import Image from 'next/image';
import { useEffect, useMemo, useState, type CSSProperties, type JSX } from 'react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { FreeMode, Navigation, Pagination } from 'swiper/modules';
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

export function ProductDetailGallery({
  slides,
  selectedColorId,
}: ProductDetailGalleryProps): JSX.Element {
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
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
  useEffect(() => {
    if (!mainSwiper) {
      return;
    }
    setActiveSlideIndex(0);
    mainSwiper.slideTo(0, 0);
    mainSwiper.update();
    if (thumbsSwiper) {
      thumbsSwiper.slideTo(0, 0);
      thumbsSwiper.update();
    }
  }, [displaySlides, mainSwiper, thumbsSwiper]);
  if (slides.length === 0) {
    return (
      <div className="flex aspect-2/3 w-full min-w-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Sản phẩm này chưa có hình ảnh!.
      </div>
    );
  }
  const hasMultipleSlides: boolean = displaySlides.length > 1;
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
  /**
   * Desktop vertical thumbs: Swiper needs a wrapper with explicit height. The main block is
   * `aspect-2/3`; this parent is `relative` so `absolute inset-y-0` gets that same height (see
   * Swiper vertical slider — height on the swiper container).
   */
  return (
    <div className="relative w-full min-w-0">
      <div className="aspect-2/3 w-full md:pr-25 lg:pr-29">
        <Swiper
          modules={[Navigation, Pagination]}
          direction="horizontal"
          navigation={hasMultipleSlides}
          pagination={
            hasMultipleSlides
              ? { clickable: true, dynamicBullets: displaySlides.length > 6 }
              : false
          }
          initialSlide={0}
          spaceBetween={0}
          style={mainSwiperStyle}
          className="product-detail-main-swiper h-full w-full bg-muted/20 [&_.swiper-button-next]:hidden! [&_.swiper-button-prev]:hidden! md:[&_.swiper-button-next]:flex! md:[&_.swiper-button-prev]:flex! [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75 [&_.swiper-pagination]:mt-3 [&_.swiper-pagination]:md:hidden [&_.swiper-pagination-bullet]:border [&_.swiper-pagination-bullet]:border-muted-foreground/40"
          onSwiper={setMainSwiper}
          onSlideChange={(swiper) => {
            setActiveSlideIndex(swiper.activeIndex);
          }}
        >
          {displaySlides.map((slide, index) => (
            <SwiperSlide
              key={slide.id}
              className="flex! h-full items-center justify-center bg-muted/10"
            >
              <div className="relative h-full w-full">
                <Image
                  src={coerceHttpImageSrc(slide.url) ?? '/images/placeholder.jpg'}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 48vw"
                  className="object-cover"
                  priority={index === 0}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      {isDesktopViewport ? (
        <div className="mt-3 h-[112px] w-full md:absolute md:inset-y-0 md:right-0 md:mt-0 md:h-auto md:w-20 md:min-h-0 lg:w-24">
          <Swiper
            modules={[FreeMode, Navigation]}
            onSwiper={setThumbsSwiper}
            direction="horizontal"
            navigation={hasMultipleSlides}
            breakpoints={{
              768: {
                direction: 'vertical',
                freeMode: false,
              },
            }}
            freeMode={{ enabled: true, minimumVelocity: 0.02 }}
            spaceBetween={8}
            slidesPerView="auto"
            watchSlidesProgress
            style={thumbsSwiperStyle}
            className="product-detail-thumbs-swiper box-border h-full min-h-0 touch-pan-x md:touch-pan-y [&_.swiper-button-prev]:hidden! [&_.swiper-button-next]:hidden! md:[&_.swiper-button-prev]:flex! md:[&_.swiper-button-next]:flex! [&_.swiper-button-prev]:scale-75 [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:z-10 [&_.swiper-button-next]:z-10"
          >
            {displaySlides.map((slide, index) => (
              <SwiperSlide
                key={`thumb-${slide.id}`}
                className={`relative aspect-2/3 h-auto! w-[72px]! shrink-0 cursor-pointer overflow-hidden border transition md:aspect-auto md:h-[118px]! md:w-full! lg:h-[134px]! ${
                  activeSlideIndex === index
                    ? 'border-foreground opacity-100'
                    : 'border-transparent opacity-70'
                }`}
                onClick={() => {
                  mainSwiper?.slideTo(index);
                }}
              >
                <Image
                  src={coerceHttpImageSrc(slide.url) ?? '/images/placeholder.jpg'}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 72px, (max-width: 1024px) 80px, 96px"
                  className="object-cover"
                  draggable={false}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : null}
    </div>
  );
}
