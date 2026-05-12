import { apiClient } from '@/lib/axios';
import type {
  CreateKnowledgeBody,
  KnowledgeItem,
  UpdateKnowledgeBody,
} from '@/modules/knowledge/types/knowledge';

export async function listKnowledge(): Promise<KnowledgeItem[]> {
  const { data } = await apiClient.get<KnowledgeItem[]>('/admin/knowledge');
  return data;
}

export async function getKnowledgeById(id: number): Promise<KnowledgeItem> {
  const { data } = await apiClient.get<KnowledgeItem>(`/admin/knowledge/${id}`);
  return data;
}

export async function createKnowledge(body: CreateKnowledgeBody): Promise<KnowledgeItem> {
  const { data } = await apiClient.post<KnowledgeItem>('/admin/knowledge', body);
  return data;
}

export async function updateKnowledge(
  id: number,
  body: UpdateKnowledgeBody,
): Promise<KnowledgeItem> {
  const { data } = await apiClient.put<KnowledgeItem>(`/admin/knowledge/${id}`, body);
  return data;
}

export async function deleteKnowledge(id: number): Promise<void> {
  await apiClient.delete(`/admin/knowledge/${id}`);
}
