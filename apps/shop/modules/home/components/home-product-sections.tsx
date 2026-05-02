import { NewArrivalSection } from '@/modules/home/components/new-arrival-section';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';

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
