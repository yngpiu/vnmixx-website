import { apiClient } from '@/lib/axios';
import type {
  CustomerProfile,
  UpdateCustomerProfilePayload,
} from '@/modules/account/types/profile';

type RawCustomerProfile = CustomerProfile & {
  dateOfBirth?: string | null;
  birthDate?: string | null;
};

function normalizeCustomerProfile(rawProfile: RawCustomerProfile): CustomerProfile {
  return {
    ...rawProfile,
    dob: rawProfile.dob ?? rawProfile.dateOfBirth ?? rawProfile.birthDate ?? null,
  };
}

export async function getMyCustomerProfile(): Promise<CustomerProfile> {
  const { data } = await apiClient.get<RawCustomerProfile>('/me/profile');
  return normalizeCustomerProfile(data);
}

export async function updateMyCustomerProfile(
  payload: UpdateCustomerProfilePayload,
): Promise<CustomerProfile> {
  const { data } = await apiClient.patch<RawCustomerProfile>('/me/profile', payload);
  return normalizeCustomerProfile(data);
}
