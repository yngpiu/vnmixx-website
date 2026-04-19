import {
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  REFRESH_TOKEN_MAX_AGE,
} from '@/config/constants';
import { apiClient } from '@/lib/axios';
import type { AuthResponse } from '@/modules/auth/types/auth';
import { isAxiosError } from 'axios';
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
    const { data: authData } = await apiClient.post<AuthResponse>('/auth/refresh', undefined, {
      headers: { 'x-refresh-token': refreshToken },
    });
    cookieStore.set(
      COOKIE_ACCESS_TOKEN,
      authData.accessToken,
      createCookieOptions(ACCESS_TOKEN_MAX_AGE, false),
    );
    cookieStore.set(
      COOKIE_REFRESH_TOKEN,
      authData.refreshToken,
      createCookieOptions(REFRESH_TOKEN_MAX_AGE, true),
    );
    return NextResponse.json({ success: true, data: { accessToken: authData.accessToken } });
  } catch (error) {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    const statusCode = isAxiosError(error) ? (error.response?.status ?? 401) : 500;
    return NextResponse.json(
      { success: false, error: 'Failed to refresh session.' },
      { status: statusCode },
    );
  }
}
