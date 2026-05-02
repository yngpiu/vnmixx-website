'use client';

import { ProductCard } from '@/modules/common/components/product-card';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

type ProductCardSliderProps = {
  products: NewArrivalProduct[];
};

export function ProductCardSlider({ products }: ProductCardSliderProps): React.JSX.Element {
  const hasNavigation: boolean = products.length > 4;
  const swiperColorVariables: React.CSSProperties = {
    '--swiper-navigation-color': 'var(--muted)',
    '--swiper-pagination-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-color': 'var(--muted)',
    '--swiper-pagination-bullet-inactive-opacity': '0.8',
    '--swiper-pagination-bullet-opacity': '1',
    overflowAnchor: 'none',
  } as React.CSSProperties;
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Chưa có sản phẩm mới cho danh mục này.
      </div>
    );
  }
  return (
    <Swiper
      modules={[Navigation]}
      navigation={hasNavigation}
      spaceBetween={16}
      slidesPerView={2}
      breakpoints={{
        640: { slidesPerView: 2, spaceBetween: 16 },
        768: {
          slidesPerView: 3,
          spaceBetween: 18,
          ...(hasNavigation ? { navigation: {} } : {}),
        },
        1024: { slidesPerView: 4, spaceBetween: 20 },
        1280: { slidesPerView: 5, spaceBetween: 20 },
      }}
      style={swiperColorVariables}
      className="[&_.swiper-button-next]:hidden! [&_.swiper-button-prev]:hidden! md:[&_.swiper-button-next]:flex! md:[&_.swiper-button-prev]:flex! [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75 [&_.swiper-button-next]:-translate-y-10 [&_.swiper-button-prev]:-translate-y-10 [&_.swiper-pagination-bullet]:border [&_.swiper-pagination-bullet]:border-muted-foreground/40"
    >
      {products.map((product: NewArrivalProduct) => (
        <SwiperSlide key={product.id}>
          <ProductCard product={product} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
