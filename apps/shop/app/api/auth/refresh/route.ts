import {
  ACCESS_TOKEN_MAX_AGE,
  API_BASE_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  REFRESH_TOKEN_MAX_AGE,
} from '@/config/constants';
import type { AuthResponse } from '@/modules/auth/types/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function createCookieOptions(maxAge: number, isHttpOnly: boolean) {
  return {
    httpOnly: isHttpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'No refresh token found.' }, { status: 401 });
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-refresh-token': refreshToken,
      },
    });
    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }
    const raw: { success: boolean; data: AuthResponse } = await response.json();
    const authData = raw.data;
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
    return NextResponse.json({ success: true, data: { accessToken: authData.accessToken } });
  } catch {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh session.' },
      { status: 401 },
    );
  }
}
