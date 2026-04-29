'use client';

import type { PublicBanner } from '@/modules/banner/types/banner';
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
  const bannerRadiusClassName =
    'rounded-tl-[60px] md:rounded-tl-[90px] rounded-tr-none rounded-bl-none rounded-br-[60px] md:rounded-br-[90px]';
  const swiperColorVariables: React.CSSProperties = {
    '--swiper-navigation-color': 'var(--muted)',
    '--swiper-pagination-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-opacity': '0.8',
    '--swiper-pagination-bullet-opacity': '1',
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
      className={`${bannerRadiusClassName} [&_.swiper-button-next]:hidden [&_.swiper-button-prev]:hidden md:[&_.swiper-button-next]:flex md:[&_.swiper-button-prev]:flex [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75 [&_.swiper-pagination-bullet]:border [&_.swiper-pagination-bullet]:border-muted-foreground/40`}
    >
      {banners.map((banner: PublicBanner) => (
        <SwiperSlide key={banner.id}>
          <Link href={`/danh-muc/${banner.category.slug}`} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt={banner.category.name}
              className={`aspect-video w-full object-cover ${bannerRadiusClassName}`}
            />
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
