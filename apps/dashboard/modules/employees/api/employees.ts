import { apiClient } from '@/lib/axios';
import type {
  CreateEmployeePayload,
  EmployeeDetail,
  EmployeeListResponse,
  ListEmployeesParams,
  UpdateEmployeePayload,
} from '@/modules/employees/types/employee';

export async function listEmployees(
  params: ListEmployeesParams = {},
): Promise<EmployeeListResponse> {
  const { data } = await apiClient.get<EmployeeListResponse>('/admin/employees', { params });
  return data;
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDetail> {
  const { data } = await apiClient.post<EmployeeDetail>('/admin/employees', payload);
  return data;
}

export async function getEmployee(id: number): Promise<EmployeeDetail> {
  const { data } = await apiClient.get<EmployeeDetail>(`/admin/employees/${id}`);
  return data;
}

export async function updateEmployee(
  id: number,
  payload: UpdateEmployeePayload,
): Promise<EmployeeDetail> {
  const { data } = await apiClient.patch<EmployeeDetail>(`/admin/employees/${id}`, payload);
  return data;
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiClient.delete(`/admin/employees/${id}`);
}

export async function restoreEmployee(id: number): Promise<EmployeeDetail> {
  const { data } = await apiClient.patch<EmployeeDetail>(`/admin/employees/${id}/restore`);
  return data;
}
