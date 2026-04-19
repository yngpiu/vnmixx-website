export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface CustomerListItem {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  gender: CustomerGender | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface CustomerDetail extends CustomerListItem {
  dob: string | null;
  emailVerifiedAt: string | null;
  updatedAt: string;
  _count: { addresses: number };
}

export interface CustomerListResponse {
  data: CustomerListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
