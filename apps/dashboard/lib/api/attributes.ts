import { apiClient } from '@/lib/axios';
import type { Attribute, AttributeListResponse, AttributeValueAdmin } from '@/lib/types/attribute';

export type ListAttributesParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function listAttributes(
  params: ListAttributesParams = {},
): Promise<AttributeListResponse> {
  const { data } = await apiClient.get<AttributeListResponse>('/admin/attributes', { params });
  return data;
}

export async function getAttribute(id: number): Promise<Attribute> {
  const { data } = await apiClient.get<Attribute>(`/admin/attributes/${id}`);
  return data;
}

export async function listAttributesWithValues(): Promise<Attribute[]> {
  const { data } = await apiClient.get<Attribute[]>('/admin/attributes/all');
  return data;
}

export async function createAttribute(body: { name: string }): Promise<Attribute> {
  const { data } = await apiClient.post<Attribute>('/admin/attributes', body);
  return data;
}

export async function updateAttribute(id: number, body: { name: string }): Promise<Attribute> {
  const { data } = await apiClient.put<Attribute>(`/admin/attributes/${id}`, body);
  return data;
}

export async function deleteAttribute(id: number): Promise<void> {
  await apiClient.delete(`/admin/attributes/${id}`);
}

export async function createAttributeValue(
  attributeId: number,
  body: { value: string },
): Promise<AttributeValueAdmin> {
  const { data } = await apiClient.post<AttributeValueAdmin>(
    `/admin/attributes/${attributeId}/values`,
    body,
  );
  return data;
}

export async function updateAttributeValue(
  attributeId: number,
  valueId: number,
  body: { value: string },
): Promise<AttributeValueAdmin> {
  const { data } = await apiClient.put<AttributeValueAdmin>(
    `/admin/attributes/${attributeId}/values/${valueId}`,
    body,
  );
  return data;
}

export async function deleteAttributeValue(attributeId: number, valueId: number): Promise<void> {
  await apiClient.delete(`/admin/attributes/${attributeId}/values/${valueId}`);
}
