import type { PublicBanner } from '@/modules/banner/types/banner';
import { buildBannerHref } from '@/modules/banner/utils/build-banner-href';
import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import Image from 'next/image';
import Link from 'next/link';

type HomePromoBannerStripProps = {
  banner: PublicBanner | null;
};

export function HomePromoBannerStrip({
  banner,
}: HomePromoBannerStripProps): React.JSX.Element | null {
  if (!banner) {
    return null;
  }
  return (
    <section className="pb-10">
      <div className="shop-shell-container">
        <Link href={buildBannerHref(banner)} className="group block">
          <div className="radius-diagonal-lg md:radius-diagonal-xl relative aspect-21/9 overflow-hidden bg-muted/20">
            <Image
              src={coerceHttpImageSrc(banner.imageUrl) ?? '/images/placeholder.jpg'}
              alt={banner.title ?? banner.category.name}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              quality={70}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </div>
        </Link>
      </div>
    </section>
  );
}
