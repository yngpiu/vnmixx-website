/** JSON body returned by login / refresh endpoints. */
export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

/** Profile returned by GET /auth/me. */
export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  userType: 'CUSTOMER' | 'EMPLOYEE';
  roles: string[];
  permissions: string[];
}

/** Credentials for POST /auth/admin/login. */
export interface LoginCredentials {
  email: string;
  password: string;
}
