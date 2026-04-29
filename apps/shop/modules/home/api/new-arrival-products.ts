import { serverApi } from '@/lib/server-api';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';

const NEW_ARRIVAL_LIMIT = 10;

async function getProductsByCategoryAndSort(
  categorySlug: string,
  sort: 'newest' | 'best_selling',
): Promise<NewArrivalProduct[]> {
  const searchParams = new URLSearchParams({
    categorySlug,
    sort,
    limit: String(NEW_ARRIVAL_LIMIT),
  });
  const payload = await serverApi.get<{ data: NewArrivalProduct[]; meta: unknown }>(
    `/products?${searchParams.toString()}`,
    { skipAuth: true },
  );
  return (payload.data ?? []).map((product: NewArrivalProduct) => ({
    ...product,
    colorHexCodes: product.colorHexCodes ?? [],
  }));
}

export async function getNewArrivalProductsByCategory(
  categorySlug: string,
): Promise<NewArrivalProduct[]> {
  return getProductsByCategoryAndSort(categorySlug, 'newest');
}

export async function getBestSellingProductsByCategory(
  categorySlug: string,
): Promise<NewArrivalProduct[]> {
  return getProductsByCategoryAndSort(categorySlug, 'best_selling');
}
