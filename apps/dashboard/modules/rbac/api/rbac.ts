import { apiClient } from '@/lib/axios';
import type {
  CreateRolePayload,
  Permission,
  RoleDetail,
  RoleListResponse,
  UpdateRolePayload,
} from '@/modules/rbac/types/rbac';

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>('/admin/permissions');
  return data;
}

export type ListRolesParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export async function listRoles(params: ListRolesParams = {}): Promise<RoleListResponse> {
  const { data } = await apiClient.get<RoleListResponse>('/admin/roles', { params });
  return data;
}

export async function getRole(id: number): Promise<RoleDetail> {
  const { data } = await apiClient.get<RoleDetail>(`/admin/roles/${id}`);
  return data;
}

export async function createRole(payload: CreateRolePayload): Promise<RoleDetail> {
  const { data } = await apiClient.post<RoleDetail>('/admin/roles', payload);
  return data;
}

export async function updateRole(id: number, payload: UpdateRolePayload): Promise<RoleDetail> {
  const { data } = await apiClient.put<RoleDetail>(`/admin/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/admin/roles/${id}`);
}
