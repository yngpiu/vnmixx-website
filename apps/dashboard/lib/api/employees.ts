import { apiClient } from '@/lib/axios';
import type { EmployeeListResponse } from '@/lib/types/employee';

export type ListEmployeesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
};

export async function listEmployees(
  params: ListEmployeesParams = {},
): Promise<EmployeeListResponse> {
  const { data } = await apiClient.get<EmployeeListResponse>('/admin/employees', { params });
  return data;
}
