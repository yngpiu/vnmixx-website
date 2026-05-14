export type ShopContentKey = 'WARRANTY_POLICY' | 'RETURN_POLICY' | 'TERMS' | 'FAQ' | 'STORE_INFO';

export type ShopContent = {
  id: number;
  key: ShopContentKey;
  title: string;
  content: string;
  updatedAt: string;
};

export type UpsertShopContentBody = {
  title: string;
  content: string;
};
