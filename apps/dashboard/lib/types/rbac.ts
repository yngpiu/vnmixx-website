export type Permission = {
  id: number;
  name: string;
  description: string | null;
};

export type RoleListItem = {
  id: number;
  name: string;
  description: string | null;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RoleDetail = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
};

export type CreateRolePayload = {
  name: string;
  description?: string;
  permissionIds?: number[];
};

export type UpdateRolePayload = {
  name?: string;
  description?: string;
};
