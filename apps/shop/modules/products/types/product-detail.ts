export type ShopProductDetailImage = {
  id: number;
  colorId: number | null;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type ShopProductDetailVariant = {
  id: number;
  colorId: number;
  sizeId: number;
  sku: string;
  price: number;
  onHand: number;
  reserved: number;
  color: { id: number; name: string; hexCode: string };
  size: { id: number; label: string; sortOrder: number };
};

export type ShopProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: { id: number; name: string; slug: string } | null;
  variants: ShopProductDetailVariant[];
  images: ShopProductDetailImage[];
};
