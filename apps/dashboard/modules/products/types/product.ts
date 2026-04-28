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

export type ProductAdminVariant = {
  id: number;
  colorId: number;
  sizeId: number;
  color?: {
    id: number;
    name: string;
    hexCode: string;
  };
  size?: {
    id: number;
    label: string;
    sortOrder: number;
  };
  sku: string;
  price: number;
  onHand: number;
  reserved: number;
  isActive: boolean;
  deletedAt: string | null;
};

export type ProductAdminImage = {
  id: number;
  colorId: number | null;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type ProductAdminDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  isActive: boolean;
  category: ProductCategoryBrief | null;
  categoryIds?: number[];
  variants: ProductAdminVariant[];
  images: ProductAdminImage[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateProductVariantInput = {
  colorId: number;
  sizeId: number;
  sku: string;
  price: number;
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

export type UpdateProductBody = {
  name?: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  categoryId?: number;
  categoryIds?: number[];
  isActive?: boolean;
  variants?: {
    id?: number;
    colorId?: number;
    sizeId?: number;
    sku?: string;
    price?: number;
    onHand?: number;
    isActive?: boolean;
  }[];
  images?: {
    id?: number;
    url?: string;
    colorId?: number | null;
    altText?: string | null;
    sortOrder?: number;
  }[];
};

export type ListProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  isSoftDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
