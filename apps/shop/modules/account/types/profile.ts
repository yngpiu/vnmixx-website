export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface CustomerProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  dob?: string | null;
  gender?: CustomerGender | null;
}

export interface UpdateCustomerProfilePayload {
  fullName: string;
  dob?: string;
  gender?: CustomerGender;
  avatarUrl?: string;
}

export interface ChangeCustomerPasswordPayload {
  currentPassword: string;
  newPassword: string;
}
