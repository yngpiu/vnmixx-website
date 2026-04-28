'use server';

import {
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  REFRESH_TOKEN_MAX_AGE,
} from '@/config/constants';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { AuthResponse, UserProfile } from '@/modules/auth/types/auth';
import { cookies } from 'next/headers';

/** Standardized result type for server actions. */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/** Cookie options shared between set operations. */
function createCookieOptions(maxAge: number, isHttpOnly: boolean) {
  return {
    httpOnly: isHttpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Extract error message from a ServerApiError or fallback. */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ServerApiError) {
    if (err.status === 429) {
      return 'Quá nhiều lần thử đăng nhập. Đợi một phút rồi thử lại.';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

/**
 * Login via NestJS employee endpoint.
 * Sets access + refresh cookies on dashboard domain.
 * Returns access token + user profile to the client.
 */
export async function loginAction(
  email: string,
  password: string,
): Promise<ActionResult<{ accessToken: string; user: UserProfile }>> {
  try {
    const authData = await serverApi.post<AuthResponse>(
      '/admin/auth/login',
      { email, password },
      { skipAuth: true },
    );
    const user = await serverApi.get<UserProfile>('/admin/me/profile', {
      headers: { Authorization: `Bearer ${authData.accessToken}` },
      skipAuth: true,
    });
    const cookieStore = await cookies();
    cookieStore.set(
      COOKIE_ACCESS_TOKEN,
      authData.accessToken,
      createCookieOptions(ACCESS_TOKEN_MAX_AGE, true),
    );
    cookieStore.set(
      COOKIE_REFRESH_TOKEN,
      authData.refreshToken,
      createCookieOptions(REFRESH_TOKEN_MAX_AGE, true),
    );
    return { success: true, data: { accessToken: authData.accessToken, user } };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Logout: invalidate session on NestJS, clear dashboard cookies.
 */
export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (accessToken) {
      await serverApi
        .post('/auth/logout', undefined, {
          headers: {
            ...(refreshToken ? { 'x-refresh-token': refreshToken } : {}),
          },
        })
        .catch(() => {
          // Ignore — clear cookies regardless
        });
    }
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
