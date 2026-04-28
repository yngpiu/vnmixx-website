/** JSON body returned by login / refresh endpoints. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

/** Employee profile returned by GET /admin/me/profile after dashboard login. */
export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  userType: 'EMPLOYEE';
  roles: string[];
  permissions: string[];
}

/** Credentials for POST /admin/auth/login. */
export interface LoginCredentials {
  email: string;
  password: string;
}
