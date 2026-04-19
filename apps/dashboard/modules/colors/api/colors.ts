import { apiClient } from '@/lib/axios';
import type { ColorAdmin, ColorListResponse, ColorPublic } from '@/modules/colors/types/color';

export type ListColorsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/** Danh sách quản trị: phân trang + sort (GET /admin/colors). */
export async function listColors(params: ListColorsParams = {}): Promise<ColorListResponse> {
  const { data } = await apiClient.get<ColorListResponse>('/admin/colors', { params });
  return data;
}

/** Toàn bộ màu công khai — dùng cho form sản phẩm, dialog sửa (GET /colors). */
export async function listPublicColors(): Promise<ColorPublic[]> {
  const { data } = await apiClient.get<ColorPublic[]>('/colors');
  return data;
}

export async function createColor(body: { name: string; hexCode: string }): Promise<ColorAdmin> {
  const { data } = await apiClient.post<ColorAdmin>('/admin/colors', body);
  return data;
}

export async function updateColor(
  id: number,
  body: { name?: string; hexCode?: string },
): Promise<ColorAdmin> {
  const { data } = await apiClient.put<ColorAdmin>(`/admin/colors/${id}`, body);
  return data;
}

export async function deleteColor(id: number): Promise<void> {
  await apiClient.delete(`/admin/colors/${id}`);
}
