import { getPublicBanners } from '@/modules/banner/api/banners';
import { HomeBannerSlider } from '@/modules/banner/components/home-banner-slider';
import { getNewArrivalProductsByCategory } from '@/modules/home/api/new-arrival-products';
import { NewArrivalSection } from '@/modules/home/components/new-arrival-section';

export default async function Page(): Promise<React.JSX.Element> {
  const banners = await getPublicBanners().catch(() => []);
  const [womenProducts, menProducts] = await Promise.all([
    getNewArrivalProductsByCategory('nu').catch(() => []),
    getNewArrivalProductsByCategory('nam').catch(() => []),
  ]);
  const bannerRadiusClassName =
    'rounded-tl-[16px] rounded-tr-none rounded-bl-none rounded-br-[16px]';

  return (
    <main className="min-h-svh">
      <section className="pb-8">
        <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px]">
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
      <NewArrivalSection womenProducts={womenProducts} menProducts={menProducts} />
    </main>
  );
}
