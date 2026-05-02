import { getPublicBanners } from '@/modules/banner/api/banners';
import { HomeBannerSlider } from '@/modules/banner/components/home-banner-slider';
import { HomeFeaturedBannerTiles } from '@/modules/banner/components/home-featured-banner-tiles';
import { HomePromoBannerStrip } from '@/modules/banner/components/home-promo-banner-strip';
import type { PublicBanner } from '@/modules/banner/types/banner';
import {
  getBestSellingProductsByCategory,
  getNewArrivalProductsByCategory,
} from '@/modules/home/api/new-arrival-products';
import { HomeProductSections } from '@/modules/home/components/home-product-sections';
import {
  HOME_MEN_CATEGORY_SLUG,
  HOME_WOMEN_CATEGORY_SLUG,
} from '@/modules/home/constants/home-category-slugs';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Trang chủ',
  description: 'VNMIXX Shop - cập nhật bộ sưu tập mới, sản phẩm bán chạy và gợi ý theo danh mục.',
  alternates: {
    canonical: '/',
  },
};

export default async function Page(): Promise<React.JSX.Element> {
  const banners = await getPublicBanners().catch(() => []);
  const [womenProducts, menProducts, bestSellingWomenProducts, bestSellingMenProducts] =
    await Promise.all([
      getNewArrivalProductsByCategory(HOME_WOMEN_CATEGORY_SLUG).catch(() => []),
      getNewArrivalProductsByCategory(HOME_MEN_CATEGORY_SLUG).catch(() => []),
      getBestSellingProductsByCategory(HOME_WOMEN_CATEGORY_SLUG).catch(() => []),
      getBestSellingProductsByCategory(HOME_MEN_CATEGORY_SLUG).catch(() => []),
    ]);
  const bannerRadiusClassName = 'radius-diagonal-md';
  const heroBanners = banners.filter((banner: PublicBanner) => banner.placement === 'HERO_SLIDER');
  const featuredTileBanners = banners
    .filter((banner: PublicBanner) => banner.placement === 'FEATURED_TILE')
    .slice(0, 4);
  const promoStripBanner =
    banners.find((banner: PublicBanner) => banner.placement === 'PROMO_STRIP') ?? null;

  return (
    <main className="min-h-svh">
      <section className="pb-8">
        <div className="shop-shell-container">
          {heroBanners.length > 0 ? (
            <HomeBannerSlider banners={heroBanners} />
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
      <HomeFeaturedBannerTiles banners={featuredTileBanners} />
      <HomePromoBannerStrip banner={promoStripBanner} />
    </main>
  );
}
