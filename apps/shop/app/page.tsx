import { getPublicBanners } from '@/modules/banner/api/banners';
import { HomeBannerSlider } from '@/modules/banner/components/home-banner-slider';
import {
  getBestSellingProductsByCategory,
  getNewArrivalProductsByCategory,
} from '@/modules/home/api/new-arrival-products';
import { HomeProductSections } from '@/modules/home/components/home-product-sections';

export default async function Page(): Promise<React.JSX.Element> {
  const banners = await getPublicBanners().catch(() => []);
  const [womenProducts, menProducts, bestSellingWomenProducts, bestSellingMenProducts] =
    await Promise.all([
      getNewArrivalProductsByCategory('nu').catch(() => []),
      getNewArrivalProductsByCategory('nam').catch(() => []),
      getBestSellingProductsByCategory('nu').catch(() => []),
      getBestSellingProductsByCategory('nam').catch(() => []),
    ]);
  const bannerRadiusClassName =
    'rounded-tl-[16px] rounded-tr-none rounded-bl-none rounded-br-[16px]';

  return (
    <main className="min-h-svh">
      <section className="pb-8">
        <div className="shop-shell-container">
          {banners.length > 0 ? (
            <HomeBannerSlider banners={banners} />
          ) : (
            <div
              className={`flex aspect-video items-center justify-center bg-muted ${bannerRadiusClassName}`}
            >
              <h1 className="text-center text-3xl font-medium tracking-wide lg:text-5xl">
                Holiday Chic Sale
              </h1>
            </div>
          )}
        </div>
      </section>
      <HomeProductSections
        womenProducts={womenProducts}
        menProducts={menProducts}
        bestSellingWomenProducts={bestSellingWomenProducts}
        bestSellingMenProducts={bestSellingMenProducts}
      />
    </main>
  );
}
