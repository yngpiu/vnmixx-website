import { apiClient } from '@/lib/axios';
import type { CreateProductBody, ProductAdminListResponse } from '@/lib/types/product';

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
