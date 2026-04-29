/** Cookie name for access token on dashboard domain. */
export const COOKIE_ACCESS_TOKEN = 'vnmixx_dashboard_access';

/** Cookie name for refresh token on dashboard domain. */
export const COOKIE_REFRESH_TOKEN = 'vnmixx_dashboard_refresh';

/** API base URL for server-side calls. */
const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
export const API_BASE_URL = rawBaseUrl.endsWith('/v1')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, '')}/v1`;

/** Access token lifetime in seconds (must match NestJS config). */
export const ACCESS_TOKEN_MAX_AGE = 900;

/** Refresh token lifetime in seconds (must match NestJS config). */
export const REFRESH_TOKEN_MAX_AGE = 604_800;
