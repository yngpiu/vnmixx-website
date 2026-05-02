export type BannerCategory = {
  id: number;
  name: string;
  slug: string;
};

export type BannerAdmin = {
  id: number;
  placement: BannerPlacement;
  title: string | null;
  imageUrl: string;
  categoryId: number;
  isActive: boolean;
  sortOrder: number;
  category: BannerCategory;
  createdAt: string;
  updatedAt: string;
};

export type ListBannersParams = {
  isActive?: boolean;
  placement?: BannerPlacement;
};

export type BannerPlacement = 'HERO_SLIDER' | 'FEATURED_TILE' | 'PROMO_STRIP';

export type CreateBannerBody = {
  placement: BannerPlacement;
  title?: string;
  imageUrl: string;
  categoryId: number;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateBannerBody = {
  placement?: BannerPlacement;
  title?: string;
  imageUrl?: string;
  categoryId?: number;
  isActive?: boolean;
  sortOrder?: number;
};
