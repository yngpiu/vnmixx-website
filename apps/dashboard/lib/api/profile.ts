import { apiClient } from '@/lib/axios';
import type {
  ChangeEmployeePasswordPayload,
  EmployeeProfile,
  UpdateEmployeeProfilePayload,
} from '@/lib/types/profile';

export async function getMyEmployeeProfile(): Promise<EmployeeProfile> {
  const { data } = await apiClient.get<EmployeeProfile>('/admin/profile');
  return data;
}

export async function updateMyEmployeeProfile(
  payload: UpdateEmployeeProfilePayload,
): Promise<EmployeeProfile> {
  const { data } = await apiClient.patch<EmployeeProfile>('/admin/profile', payload);
  return data;
}

export async function changeMyPassword(payload: ChangeEmployeePasswordPayload): Promise<void> {
  await apiClient.post('/auth/admin/change-password', payload);
}
