import { apiClient } from '@/lib/axios';
import type { RoleListItem } from '@/lib/types/role';

export async function listRoles(): Promise<RoleListItem[]> {
  const { data } = await apiClient.get<RoleListItem[]>('/admin/roles');
  return data;
}
