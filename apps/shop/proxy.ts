import {
  ACCESS_TOKEN_MAX_AGE,
  API_BASE_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  REFRESH_TOKEN_MAX_AGE,
} from '@/config/constants';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

const PUBLIC_AUTH_PATHS = ['/login', '/signup', '/otp'];
const PROTECTED_PATHS = ['/tai-khoan'];

function isPathMatched(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicPathname(pathname: string): boolean {
  return pathname === '/' || isPathMatched(pathname, PUBLIC_AUTH_PATHS);
}

function decodeJwtExpiration(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const decoded = JSON.parse(atob(payloadPart));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const exp = decodeJwtExpiration(token);
  if (!exp) return false;
  return exp * 1000 > Date.now() + 30_000;
}

async function tryRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; newRefreshToken: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-refresh-token': refreshToken,
      },
    });
    if (!res.ok) return null;
    const raw: { success: boolean; data: AuthResponse } = await res.json();
    return { accessToken: raw.data.accessToken, newRefreshToken: raw.data.refreshToken };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicPathname(pathname);
  const isProtectedPath = isPathMatched(pathname, PROTECTED_PATHS);
  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  const hasValidAccess = accessToken ? isTokenValid(accessToken) : false;
  if (hasValidAccess) {
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  if (refreshToken) {
    const result = await tryRefresh(refreshToken);
    if (result) {
      const destination = isPublicPath
        ? NextResponse.redirect(new URL('/', request.url))
        : NextResponse.next();
      destination.cookies.set(COOKIE_ACCESS_TOKEN, result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });
      destination.cookies.set(COOKIE_REFRESH_TOKEN, result.newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
      return destination;
    }
    if (isProtectedPath) {
      const loginRedirect = NextResponse.redirect(new URL('/login', request.url));
      loginRedirect.cookies.delete(COOKIE_ACCESS_TOKEN);
      loginRedirect.cookies.delete(COOKIE_REFRESH_TOKEN);
      return loginRedirect;
    }
    const destination = NextResponse.next();
    destination.cookies.delete(COOKIE_ACCESS_TOKEN);
    destination.cookies.delete(COOKIE_REFRESH_TOKEN);
    return destination;
  }
  if (isPublicPath || !isProtectedPath) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};
