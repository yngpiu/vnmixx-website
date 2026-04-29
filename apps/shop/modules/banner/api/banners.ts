import { serverApi } from '@/lib/server-api';
import type { PublicBanner } from '@/modules/banner/types/banner';

export async function getPublicBanners(): Promise<PublicBanner[]> {
  return serverApi.get<PublicBanner[]>('/banners', { skipAuth: true });
}
