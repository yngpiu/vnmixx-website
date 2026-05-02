import type { ProductListColor } from '@/modules/home/types/new-arrival-product';

export type WishlistProductVariant = {
  price: number;
};

export type WishlistProduct = {
  id: number;
  name: string;
  slug: string;
  colors: ProductListColor[];
  variants: WishlistProductVariant[];
};

export type WishlistItem = {
  createdAt: string;
  product: WishlistProduct;
};
