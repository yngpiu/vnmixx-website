/** Khớp phần tử `data[]` trong `RoleListResponseDto` (GET /admin/roles). */
export interface RoleListItem {
  id: number;
  name: string;
  description: string | null;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}
