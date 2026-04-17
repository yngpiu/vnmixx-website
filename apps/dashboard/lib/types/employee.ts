/** Khớp `EmployeeListItemResponseDto` từ API. */

export interface EmployeeRoleBrief {
  role: {
    id: number;
    name: string;
  };
}

export interface EmployeeListItem {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  deletedAt: string | null;
  employeeRoles: EmployeeRoleBrief[];
}

export interface ListPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListResponse {
  data: EmployeeListItem[];
  meta: ListPaginationMeta;
}

/** Khớp `EmployeeDetailResponseDto` từ API. */
export interface EmployeeDetail extends EmployeeListItem {
  updatedAt: string;
}

export type CreateEmployeePayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  roleIds?: number[];
};

export type UpdateEmployeePayload = {
  status?: 'ACTIVE' | 'INACTIVE';
  roleIds?: number[];
};
