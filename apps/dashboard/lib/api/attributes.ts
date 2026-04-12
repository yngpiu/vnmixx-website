import { apiClient } from '@/lib/axios';
import type { Attribute, AttributeValueAdmin } from '@/lib/types/attribute';

export async function listAttributes(): Promise<Attribute[]> {
  const { data } = await apiClient.get<Attribute[]>('/admin/attributes');
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
