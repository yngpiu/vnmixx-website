import { getPublicBanners } from '@/modules/banner/api/banners';
import Link from 'next/link';

export default async function Page(): Promise<React.JSX.Element> {
  const banners = await getPublicBanners().catch(() => []);
  const heroBanner = banners[0] ?? null;

  return (
    <main className="min-h-svh">
      <section className="pt-4 pb-8">
        <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px]">
          {heroBanner ? (
            <Link href={`/danh-muc/${heroBanner.category.slug}`} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroBanner.imageUrl}
                alt={heroBanner.category.name}
                className="h-[220px] w-full rounded-3xl object-cover lg:h-[420px]"
              />
            </Link>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-3xl bg-muted lg:h-[420px]">
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
