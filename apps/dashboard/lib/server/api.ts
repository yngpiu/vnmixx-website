import { API_BASE_URL, COOKIE_ACCESS_TOKEN } from '@/lib/constants';
import { cookies } from 'next/headers';

/**
 * Server-side fetch helper that automatically attaches the
 * access token from cookies as a Bearer Authorization header.
 *
 * Use in Server Components and Server Actions to call the NestJS API.
 *
 * @example
 * ```ts
 * const products = await serverFetch<Product[]>('/products');
 * ```
 */
export async function serverFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
