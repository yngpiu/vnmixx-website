import { apiClient } from '@/lib/axios';
import type {
  CreateInventoryVoucherBody,
  InventoryListResponse,
  InventoryMovementsResponse,
  InventoryVoucherDetail,
  InventoryVoucherListResponse,
  ListInventoryMovementsParams,
  ListInventoryParams,
} from '@/modules/inventory/types/inventory';

export async function listInventory(
  params: ListInventoryParams = {},
): Promise<InventoryListResponse> {
  const { data } = await apiClient.get<InventoryListResponse>('/admin/inventory', { params });
  return data;
}

export async function listInventoryMovements(
  params: ListInventoryMovementsParams = {},
): Promise<InventoryMovementsResponse> {
  const { data } = await apiClient.get<InventoryMovementsResponse>('/admin/inventory/movements', {
    params,
  });
  return data;
}

export async function createInventoryVoucher(
  body: CreateInventoryVoucherBody,
): Promise<InventoryVoucherDetail> {
  const { data } = await apiClient.post<InventoryVoucherDetail>('/admin/inventory/vouchers', body);
  return data;
}

export async function listInventoryVouchers(
  params: {
    page?: number;
    limit?: number;
    type?: 'IMPORT' | 'EXPORT';
  } = {},
): Promise<InventoryVoucherListResponse> {
  const { data } = await apiClient.get<InventoryVoucherListResponse>('/admin/inventory/vouchers', {
    params,
  });
  return data;
}

export async function getInventoryVoucherDetail(
  voucherId: number,
): Promise<InventoryVoucherDetail> {
  const { data } = await apiClient.get<InventoryVoucherDetail>(
    `/admin/inventory/vouchers/${voucherId}`,
  );
  return data;
}
