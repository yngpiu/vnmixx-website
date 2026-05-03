import type { PublicBanner } from '@/modules/banner/types/banner';
import { buildCategoryHref } from '@/modules/common/utils/shop-routes';

export function buildBannerHref(banner: PublicBanner): string {
  const normalizedCategorySlug = banner.category.slug?.trim();
  if (!normalizedCategorySlug) {
    return '/products';
  }
  return buildCategoryHref({
    slug: normalizedCategorySlug,
  });
}
