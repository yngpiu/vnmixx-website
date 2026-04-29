import type { ShopCategory } from '@/modules/header/types/header';

interface SuccessResponse<TData> {
  success: true;
  data: TData;
  message?: string;
}

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, '');
  return normalizedBaseUrl.endsWith('/v1') ? normalizedBaseUrl : `${normalizedBaseUrl}/v1`;
}

export async function listShopCategories(): Promise<ShopCategory[]> {
  const response = await fetch(`${getApiBaseUrl()}/categories`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  const result = (await response.json()) as SuccessResponse<ShopCategory[]>;
  return result.data ?? [];
}
