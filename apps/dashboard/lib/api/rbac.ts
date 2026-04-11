import { apiClient } from '@/lib/axios';
import type {
  CreateRolePayload,
  Permission,
  RoleDetail,
  RoleListItem,
  UpdateRolePayload,
} from '@/lib/types/rbac';

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<Permission[]>('/admin/permissions');
  return data;
}

export async function listRoles(): Promise<RoleListItem[]> {
  const { data } = await apiClient.get<RoleListItem[]>('/admin/roles');
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
  const { data } = await apiClient.patch<RoleDetail>(`/admin/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/admin/roles/${id}`);
}

export async function syncRolePermissions(
  roleId: number,
  permissionIds: number[],
): Promise<RoleDetail> {
  const { data } = await apiClient.put<RoleDetail>(`/admin/roles/${roleId}/permissions`, {
    permissionIds,
  });
  return data;
}
