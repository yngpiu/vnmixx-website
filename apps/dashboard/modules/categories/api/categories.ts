import { apiClient } from '@/lib/axios';
import type {
  CategoryAdmin,
  CreateCategoryBody,
  ListCategoriesParams,
  UpdateCategoryBody,
} from '@/modules/categories/types/category';
export type {
  CreateCategoryBody,
  ListCategoriesParams,
  UpdateCategoryBody,
} from '@/modules/categories/types/category';

export async function listCategories(params: ListCategoriesParams = {}): Promise<CategoryAdmin[]> {
  const { data } = await apiClient.get<CategoryAdmin[]>('/admin/categories', { params });
  return data;
}

export async function createCategory(body: CreateCategoryBody): Promise<CategoryAdmin> {
  const { data } = await apiClient.post<CategoryAdmin>('/admin/categories', body);
  return data;
}

export async function updateCategory(id: number, body: UpdateCategoryBody): Promise<CategoryAdmin> {
  const { data } = await apiClient.put<CategoryAdmin>(`/admin/categories/${id}`, body);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/admin/categories/${id}`);
}

export async function restoreCategory(id: number): Promise<CategoryAdmin> {
  const { data } = await apiClient.patch<CategoryAdmin>(`/admin/categories/${id}/restore`);
  return data;
}
