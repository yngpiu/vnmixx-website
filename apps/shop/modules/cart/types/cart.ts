export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
}

export interface CartVariantColor {
  id: number;
  name: string;
  hexCode: string;
}

export interface CartVariantSize {
  id: number;
  label: string;
}

export interface CartVariant {
  id: number;
  sku: string;
  price: number;
  onHand: number;
  reserved: number;
  color: CartVariantColor;
  size: CartVariantSize;
  product: CartProduct;
}

export interface CartItem {
  id: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  variant: CartVariant;
}

export interface Cart {
  id: number;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

export interface AddCartItemPayload {
  variantId: number;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface ProductVariantOption {
  id: number;
  price: number;
  onHand: number;
  reserved: number;
  color: {
    id: number;
    name: string;
    hexCode: string;
  };
  size: {
    id: number;
    label: string;
  };
}

export interface ProductVariantMatrix {
  variants: ProductVariantOption[];
}
