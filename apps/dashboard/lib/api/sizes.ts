import { apiClient } from '@/lib/axios';
import type { SizeAdmin } from '@/lib/types/size';

export async function listSizes(): Promise<SizeAdmin[]> {
  const { data } = await apiClient.get<SizeAdmin[]>('/admin/sizes');
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
