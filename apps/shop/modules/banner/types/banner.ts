export type PublicBannerCategory = {
  id: number;
  name: string;
  slug: string;
};

export type PublicBanner = {
  id: number;
  imageUrl: string;
  categoryId: number;
  isActive: boolean;
  sortOrder: number;
  category: PublicBannerCategory;
  createdAt: string;
  updatedAt: string;
};
