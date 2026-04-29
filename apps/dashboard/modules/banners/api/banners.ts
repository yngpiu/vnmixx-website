import { apiClient } from '@/lib/axios';
import type {
  BannerAdmin,
  CreateBannerBody,
  ListBannersParams,
  UpdateBannerBody,
} from '@/modules/banners/types/banner';

export async function listBanners(params: ListBannersParams = {}): Promise<BannerAdmin[]> {
  const { data } = await apiClient.get<BannerAdmin[]>('/admin/banners', { params });
  return data;
}

export async function getBannerById(id: number): Promise<BannerAdmin> {
  const { data } = await apiClient.get<BannerAdmin>(`/admin/banners/${id}`);
  return data;
}

export async function createBanner(body: CreateBannerBody): Promise<BannerAdmin> {
  const { data } = await apiClient.post<BannerAdmin>('/admin/banners', body);
  return data;
}

export async function updateBanner(id: number, body: UpdateBannerBody): Promise<BannerAdmin> {
  const { data } = await apiClient.put<BannerAdmin>(`/admin/banners/${id}`, body);
  return data;
}

export async function deleteBanner(id: number): Promise<void> {
  await apiClient.delete(`/admin/banners/${id}`);
}
