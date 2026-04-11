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
  isActive: boolean;
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
