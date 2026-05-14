import { apiClient } from '@/lib/axios';
import type {
  ShopContent,
  ShopContentKey,
  UpsertShopContentBody,
} from '@/modules/knowledge/types/knowledge';

export async function listShopContent(): Promise<ShopContent[]> {
  const { data } = await apiClient.get<ShopContent[]>('/admin/shop-contents');
  return data;
}

export async function getShopContentByKey(key: ShopContentKey): Promise<ShopContent | null> {
  const { data } = await apiClient.get<ShopContent | null>(`/admin/shop-contents/${key}`);
  return data;
}

export async function upsertShopContent(
  key: ShopContentKey,
  body: UpsertShopContentBody,
): Promise<ShopContent> {
  const { data } = await apiClient.put<ShopContent>(`/admin/shop-contents/${key}`, body);
  return data;
}
