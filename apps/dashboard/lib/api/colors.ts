import { apiClient } from '@/lib/axios';
import type { ColorAdmin } from '@/lib/types/color';

export async function listColors(): Promise<ColorAdmin[]> {
  const { data } = await apiClient.get<ColorAdmin[]>('/admin/colors');
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
