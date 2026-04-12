import { listRoles as fetchRolesPage } from '@/lib/api/rbac';
import type { RoleListItem } from '@/lib/types/role';

/** Vai trò cho form gán vai trò nhân viên (một trang, tối đa 100). */
export async function listRoles(): Promise<RoleListItem[]> {
  const res = await fetchRolesPage({ page: 1, limit: 100 });
  return res.data;
}
