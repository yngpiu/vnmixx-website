import { serverApi } from '@/lib/server-api';
import type { NewArrivalProduct } from '@/modules/home/types/new-arrival-product';

const NEW_ARRIVAL_LIMIT = 10;

export async function getNewArrivalProductsByCategory(
  categorySlug: string,
): Promise<NewArrivalProduct[]> {
  const searchParams = new URLSearchParams({
    categorySlug,
    sort: 'newest',
    limit: String(NEW_ARRIVAL_LIMIT),
  });
  const payload = await serverApi.get<{ data: NewArrivalProduct[]; meta: unknown }>(
    `/products?${searchParams.toString()}`,
    { skipAuth: true },
  );
  return payload.data ?? [];
}
