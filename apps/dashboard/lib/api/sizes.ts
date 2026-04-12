import { apiClient } from '@/lib/axios';
import type { SizeAdmin, SizeListResponse, SizePublic } from '@/lib/types/size';

export type ListSizesParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/** Danh sách quản trị: phân trang + sort (GET /admin/sizes). */
export async function listSizes(params: ListSizesParams = {}): Promise<SizeListResponse> {
  const { data } = await apiClient.get<SizeListResponse>('/admin/sizes', { params });
  return data;
}

/** Toàn bộ kích cỡ công khai — dùng cho form sản phẩm, dialog sửa (GET /sizes). */
export async function listPublicSizes(): Promise<SizePublic[]> {
  const { data } = await apiClient.get<SizePublic[]>('/sizes');
  return data;
}

export async function createSize(body: { label: string; sortOrder?: number }): Promise<SizeAdmin> {
  const { data } = await apiClient.post<SizeAdmin>('/admin/sizes', body);
  return data;
}

export async function updateSize(
  id: number,
  body: { label?: string; sortOrder?: number },
): Promise<SizeAdmin> {
  const { data } = await apiClient.put<SizeAdmin>(`/admin/sizes/${id}`, body);
  return data;
}

export async function deleteSize(id: number): Promise<void> {
  await apiClient.delete(`/admin/sizes/${id}`);
}
