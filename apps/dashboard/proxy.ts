import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_ACCESS_TOKEN = 'vnmixx_access';
const COOKIE_REFRESH_TOKEN = 'vnmixx_refresh';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const ACCESS_TOKEN_MAX_AGE = 900;
const REFRESH_TOKEN_MAX_AGE = 604_800;

interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

const PUBLIC_PATHS = ['/login'];

/** Decode JWT payload without external dependencies. */
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

/** Check if a JWT access token is still valid (not expired). */
function isTokenValid(token: string): boolean {
  const exp = decodeJwtExpiration(token);
  if (!exp) return false;
  // 30s buffer to account for clock skew / latency
  return exp * 1000 > Date.now() + 30_000;
}

/** Attempt to refresh the session using the refresh token cookie. */
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
    const data: AuthResponse = await res.json();
    return { accessToken: data.accessToken, newRefreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  const hasValidAccess = accessToken ? isTokenValid(accessToken) : false;
  // ── Valid access token ─────────────────────────────────────
  if (hasValidAccess) {
    if (isPublicPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  // ── Access token expired or missing — try refresh ──────────
  if (refreshToken) {
    const result = await tryRefresh(refreshToken);
    if (result) {
      const destination = isPublicPath
        ? NextResponse.redirect(new URL('/dashboard', request.url))
        : NextResponse.next();
      destination.cookies.set(COOKIE_ACCESS_TOKEN, result.accessToken, {
        httpOnly: false,
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
    // Refresh failed — clear stale cookies
    const loginRedirect = NextResponse.redirect(new URL('/login', request.url));
    loginRedirect.cookies.delete(COOKIE_ACCESS_TOKEN);
    loginRedirect.cookies.delete(COOKIE_REFRESH_TOKEN);
    return loginRedirect;
  }
  // ── No tokens at all ──────────────────────────────────────
  if (isPublicPath) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};
