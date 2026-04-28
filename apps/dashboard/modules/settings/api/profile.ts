import { apiClient } from '@/lib/axios';
import type {
  ChangeEmployeePasswordPayload,
  EmployeeProfile,
  UpdateEmployeeProfilePayload,
} from '@/modules/settings/types/profile';

export async function getMyEmployeeProfile(): Promise<EmployeeProfile> {
  const { data } = await apiClient.get<EmployeeProfile>('/admin/me/profile');
  return data;
}

export async function updateMyEmployeeProfile(
  payload: UpdateEmployeeProfilePayload,
): Promise<EmployeeProfile> {
  const { data } = await apiClient.patch<EmployeeProfile>('/admin/me/profile', payload);
  return data;
}

export async function changeMyPassword(payload: ChangeEmployeePasswordPayload): Promise<void> {
  await apiClient.put('/admin/me/profile/change-password', payload);
}
