export interface EmployeeProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  createdAt: string;
}

export type UpdateEmployeeProfilePayload = {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
};

export type ChangeEmployeePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
