export type BannerCategory = {
  id: number;
  name: string;
  slug: string;
};

export type BannerAdmin = {
  id: number;
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
};

export type CreateBannerBody = {
  imageUrl: string;
  categoryId: number;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateBannerBody = {
  imageUrl?: string;
  categoryId?: number;
  isActive?: boolean;
  sortOrder?: number;
};
