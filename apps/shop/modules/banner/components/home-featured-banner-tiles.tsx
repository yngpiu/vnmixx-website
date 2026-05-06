import type { PublicBanner } from '@/modules/banner/types/banner';
import { buildBannerHref } from '@/modules/banner/utils/build-banner-href';
import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import Image from 'next/image';
import Link from 'next/link';

type HomeFeaturedBannerTilesProps = {
  banners: PublicBanner[];
};

export function HomeFeaturedBannerTiles({
  banners,
}: HomeFeaturedBannerTilesProps): React.JSX.Element | null {
  const featuredTileBanners: PublicBanner[] = banners.slice(0, 4);
  if (featuredTileBanners.length === 0) {
    return null;
  }
  return (
    <section className="pb-12">
      <div className="shop-shell-container grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
        {featuredTileBanners.map((banner: PublicBanner) => (
          <Link key={banner.id} href={buildBannerHref(banner)} className="group block">
            <div className="radius-diagonal-lg md:radius-diagonal-lg relative aspect-square overflow-hidden bg-muted/20">
              <Image
                src={coerceHttpImageSrc(banner.imageUrl) ?? '/images/placeholder.jpg'}
                alt={banner.title ?? banner.category.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <p className="mt-2 text-center text-base font-medium text-foreground">
              {banner.title ?? banner.category.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
