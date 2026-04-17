export type ProductCategoryBrief = {
  id: number;
  name: string;
  slug?: string;
};

export type ProductAdminListItem = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  isActive: boolean;
  category: ProductCategoryBrief | null;
  variantCount: number;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductAdminListResponse = {
  data: ProductAdminListItem[];
  meta: ProductListMeta;
};

export type CreateProductVariantInput = {
  colorId: number;
  sizeId: number;
  sku: string;
  price: number;
  salePrice?: number;
  onHand: number;
};

export type CreateProductImageInput = {
  url: string;
  colorId?: number;
  altText?: string;
  sortOrder?: number;
};

export type CreateProductBody = {
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  /** Nhiều danh mục lá (bảng nối). Ưu tiên hơn `categoryId` nếu cả hai có. */
  categoryIds?: number[];
  /** @deprecated Dùng `categoryIds`. */
  categoryId?: number;
  isActive?: boolean;
  variants: CreateProductVariantInput[];
  images?: CreateProductImageInput[];
};
