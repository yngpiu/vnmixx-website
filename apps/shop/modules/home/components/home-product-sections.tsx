'use client';

import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';
import dynamic from 'next/dynamic';

const NewArrivalSection = dynamic(
  () =>
    import('@/modules/home/components/new-arrival-section').then(
      (module) => module.NewArrivalSection,
    ),
  {
    ssr: false,
    loading: () => <section className="pb-16" />,
  },
);

type HomeProductSectionsProps = {
  womenProducts: NewArrivalProduct[];
  menProducts: NewArrivalProduct[];
  bestSellingWomenProducts: NewArrivalProduct[];
  bestSellingMenProducts: NewArrivalProduct[];
};

export function HomeProductSections({
  womenProducts,
  menProducts,
  bestSellingWomenProducts,
  bestSellingMenProducts,
}: HomeProductSectionsProps): React.JSX.Element {
  return (
    <>
      <NewArrivalSection
        title="HÀNG MỚI"
        sort="newest"
        womenProducts={womenProducts}
        menProducts={menProducts}
      />
      <NewArrivalSection
        title="BÁN CHẠY NHẤT"
        sort="best_selling"
        womenProducts={bestSellingWomenProducts}
        menProducts={bestSellingMenProducts}
      />
    </>
  );
}
