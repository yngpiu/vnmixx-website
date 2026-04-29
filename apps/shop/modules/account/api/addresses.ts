import { apiClient } from '@/lib/axios';
import type {
  CustomerAddress,
  UpdateCustomerAddressPayload,
  UpsertCustomerAddressPayload,
} from '@/modules/account/types/address';

export async function getMyCustomerAddresses(): Promise<CustomerAddress[]> {
  const { data } = await apiClient.get<CustomerAddress[]>('/me/addresses');
  return data;
}

export async function createMyCustomerAddress(
  payload: UpsertCustomerAddressPayload,
): Promise<CustomerAddress> {
  const { data } = await apiClient.post<CustomerAddress>('/me/addresses', payload);
  return data;
}

export async function updateMyCustomerAddress({
  id,
  payload,
}: {
  id: number;
  payload: UpdateCustomerAddressPayload;
}): Promise<CustomerAddress> {
  const { data } = await apiClient.put<CustomerAddress>(`/me/addresses/${id}`, payload);
  return data;
}

export async function deleteMyCustomerAddress(id: number): Promise<void> {
  await apiClient.delete(`/me/addresses/${id}`);
}
