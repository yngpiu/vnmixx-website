export type PublicBannerCategory = {
  id: number;
  name: string;
  slug: string;
};

export type PublicBannerPlacement = 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';

export type PublicBanner = {
  id: number;
  placement: PublicBannerPlacement;
  title: string | null;
  imageUrl: string;
  categoryId: number;
  isActive: boolean;
  sortOrder: number;
  category: PublicBannerCategory;
  createdAt: string;
  updatedAt: string;
};
