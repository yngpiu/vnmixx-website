import { apiClient } from '@/lib/axios';
import type {
  CreateProductBody,
  ProductAdminDetail,
  ProductAdminListResponse,
  UpdateProductBody,
} from '@/modules/products/types/product';

export type ListProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  isSoftDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function listProducts(
  params: ListProductsParams = {},
): Promise<ProductAdminListResponse> {
  const { data } = await apiClient.get<ProductAdminListResponse>('/admin/products', { params });
  return data;
}

export async function createProduct(body: CreateProductBody) {
  const { data } = await apiClient.post('/admin/products', body);
  return data;
}

export async function getProductById(id: number): Promise<ProductAdminDetail> {
  const { data } = await apiClient.get<ProductAdminDetail>(`/admin/products/${id}`);
  return data;
}

export async function updateProduct(
  id: number,
  body: UpdateProductBody,
): Promise<ProductAdminDetail> {
  const { data } = await apiClient.put<ProductAdminDetail>(`/admin/products/${id}`, body);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/admin/products/${id}`);
}

export async function restoreProduct(id: number): Promise<ProductAdminDetail> {
  const { data } = await apiClient.patch<ProductAdminDetail>(`/admin/products/${id}/restore`);
  return data;
}
