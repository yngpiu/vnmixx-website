/** JWT payload embedded in the access token. */
export interface JwtPayload {
  /** User ID (maps to customer.id or employee.id) */
  sub: number;
  /** User email address */
  email: string;
  /** Discriminator: which table the user belongs to */
  userType: 'CUSTOMER' | 'EMPLOYEE';
  /** Employee role names (empty for customers) */
  roles?: string[];
  /** Employee permission names (empty for customers) */
  permissions?: string[];
  /** JWT issued-at (added by @nestjs/jwt) */
  iat?: number;
  /** JWT expiration (added by @nestjs/jwt) */
  exp?: number;
  /** Unique token identifier for blacklisting */
  jti?: string;
}

/** Authenticated user object attached to the request by JwtStrategy. */
export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  userType: 'CUSTOMER' | 'EMPLOYEE';
  roles: string[];
  permissions: string[];
  /** Original JWT ID — needed for blacklisting on logout */
  jti: string;
  /** Access token expiration (Unix timestamp, seconds) */
  exp: number;
  /** Access token issued-at (Unix timestamp, seconds) */
  iat: number;
}

/** Metadata extracted from the incoming request. */
export interface RequestMeta {
  ipAddress?: string;
  deviceInfo?: string;
}
