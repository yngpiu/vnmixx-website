import { apiClient } from '@/lib/axios';
import type {
  CustomerDetail,
  CustomerListResponse,
  ListCustomersParams,
} from '@/modules/customers/types/customer';

export async function listCustomers(
  params: ListCustomersParams = {},
): Promise<CustomerListResponse> {
  const { data } = await apiClient.get<CustomerListResponse>('/admin/customers', { params });
  return data;
}

export async function getCustomer(id: number): Promise<CustomerDetail> {
  const { data } = await apiClient.get<CustomerDetail>(`/admin/customers/${id}`);
  return data;
}

export async function updateCustomer(
  id: number,
  body: { isActive: boolean },
): Promise<CustomerDetail> {
  const { data } = await apiClient.patch<CustomerDetail>(`/admin/customers/${id}`, body);
  return data;
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`/admin/customers/${id}`);
}

export async function restoreCustomer(id: number): Promise<CustomerDetail> {
  const { data } = await apiClient.patch<CustomerDetail>(`/admin/customers/${id}/restore`);
  return data;
}
