import { API_BASE_URL, COOKIE_ACCESS_TOKEN } from '@/config/constants';
import { cookies } from 'next/headers';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export class ServerApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    const detail =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: unknown }).message
        : statusText;
    const message = Array.isArray(detail) ? detail.map(String).join(', ') : String(detail);
    super(message);
    this.name = 'ServerApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function executeRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ServerApiError(response.status, response.statusText, errorBody);
  }
  const text = await response.text();
  if (!text) return undefined as T;
  const json = JSON.parse(text) as (ApiResponse<T> & { meta?: unknown }) | T;
  if (typeof json === 'object' && json !== null && 'success' in json && 'data' in json) {
    if ('meta' in json) {
      const { success: _, timestamp: __, ...payload } = json; // eslint-disable-line @typescript-eslint/no-unused-vars
      return payload as T;
    }
    return (json as ApiResponse<T>).data;
  }
  return json as T;
}

export const serverApi = {
  get: <T>(path: string, options?: RequestOptions) =>
    executeRequest<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    executeRequest<T>('DELETE', path, undefined, options),
} as const;
