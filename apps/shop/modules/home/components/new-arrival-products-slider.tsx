'use client';

import { NewArrivalProductItem } from '@/modules/home/components/new-arrival-product-item';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

type NewArrivalProductsSliderProps = {
  categorySlug: string;
  products: NewArrivalProduct[];
};

export function NewArrivalProductsSlider({
  categorySlug,
  products,
}: NewArrivalProductsSliderProps): React.JSX.Element {
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
      navigation={products.length > 4}
      spaceBetween={16}
      slidesPerView={2}
      breakpoints={{
        640: { slidesPerView: 2, spaceBetween: 16 },
        768: { slidesPerView: 3, spaceBetween: 18 },
        1024: { slidesPerView: 4, spaceBetween: 20 },
      }}
      className="[&_.swiper-button-next]:hidden [&_.swiper-button-prev]:hidden md:[&_.swiper-button-next]:flex md:[&_.swiper-button-prev]:flex [&_.swiper-button-next]:scale-75 [&_.swiper-button-prev]:scale-75"
    >
      {products.map((product: NewArrivalProduct) => (
        <SwiperSlide key={product.id}>
          <NewArrivalProductItem categorySlug={categorySlug} product={product} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
