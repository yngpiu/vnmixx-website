export type WishlistProductVariant = {
  price: number;
};

export type WishlistProduct = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  variants: WishlistProductVariant[];
};

export type WishlistItem = {
  createdAt: string;
  product: WishlistProduct;
};
