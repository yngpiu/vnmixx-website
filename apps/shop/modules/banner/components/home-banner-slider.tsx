'use client';

import type { PublicBanner } from '@/modules/banner/types/banner';
import { buildBannerHref } from '@/modules/banner/utils/build-banner-href';
import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import Image from 'next/image';
import Link from 'next/link';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

type HomeBannerSliderProps = {
  banners: PublicBanner[];
};

export function HomeBannerSlider({ banners }: HomeBannerSliderProps): React.JSX.Element {
  const bannerRadiusClassName = 'radius-diagonal-lg md:radius-diagonal-xl';
  const swiperColorVariables: React.CSSProperties = {
    '--swiper-navigation-color': 'var(--muted)',
    '--swiper-pagination-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-opacity': '0.8',
    '--swiper-pagination-bullet-opacity': '1',
    overflowAnchor: 'none',
  } as React.CSSProperties;

  return (
    <Swiper
      modules={[Autoplay, Navigation, Pagination]}
      slidesPerView={1}
      loop={banners.length > 1}
      autoplay={
        banners.length > 1
          ? {
              delay: 4000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }
          : false
      }
      navigation={banners.length > 1}
      pagination={{ clickable: true }}
      style={swiperColorVariables}
      className={`${bannerRadiusClassName} [&_.swiper-button-next]:hidden! [&_.swiper-button-prev]:hidden! md:[&_.swiper-button-next]:flex! md:[&_.swiper-button-prev]:flex! [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75 [&_.swiper-pagination-bullet]:border [&_.swiper-pagination-bullet]:border-muted-foreground/40`}
    >
      {banners.map((banner: PublicBanner, slideIndex: number) => (
        <SwiperSlide key={banner.id}>
          <Link href={buildBannerHref(banner)} className="block">
            <div className={`relative aspect-21/9 w-full overflow-hidden ${bannerRadiusClassName}`}>
              <Image
                src={coerceHttpImageSrc(banner.imageUrl) ?? '/images/placeholder.jpg'}
                alt={banner.title ?? banner.category.name}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                quality={75}
                className="object-cover"
                priority={slideIndex === 0}
                fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
              />
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
