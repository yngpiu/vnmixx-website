import { getPublicBanners } from '@/modules/banner/api/banners';
import { HomeBannerSlider } from '@/modules/banner/components/home-banner-slider';

export default async function Page(): Promise<React.JSX.Element> {
  const banners = await getPublicBanners().catch(() => []);
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
      <section className="pb-16">
        <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px]">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-[0.2em] uppercase">New Arrival</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Khu vực sản phẩm sẽ được triển khai tiếp ở bước sau.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
