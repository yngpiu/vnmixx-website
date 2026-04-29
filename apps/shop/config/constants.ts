export const COOKIE_ACCESS_TOKEN = 'vnmixx_access';

export const COOKIE_REFRESH_TOKEN = 'vnmixx_refresh';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
export const API_BASE_URL = rawBaseUrl.endsWith('/v1')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, '')}/v1`;

export const ACCESS_TOKEN_MAX_AGE = 900;

export const REFRESH_TOKEN_MAX_AGE = 604_800;
