/** JWT payload embedded in the mã truy cập (minimal claims; employee authz loaded per request). */
export interface JwtPayload {
  /** User ID (maps to customer.id or employee.id) */
  sub: number;
  /** Discriminator: which table the user belongs to */
  userType: 'CUSTOMER' | 'EMPLOYEE';
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
  /** Ảnh đại diện (nếu có) — lấy từ bảng employee/customer. */
  avatarUrl?: string | null;
  userType: 'CUSTOMER' | 'EMPLOYEE';
  roles: string[];
  permissions: string[];
  /** Original JWT ID — needed for blacklisting on logout */
  jti: string;
  /** Mã truy cập expiration (Unix timestamp, seconds) */
  exp: number;
  /** Mã truy cập issued-at (Unix timestamp, seconds) */
  iat: number;
}

/** Metadata extracted from the incoming request. */
export interface RequestMeta {
  ipAddress?: string;
  deviceInfo?: string;
}

/** Access payload for JSON + raw refresh for HttpOnly cookie only. */
export interface TokenPair {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}
