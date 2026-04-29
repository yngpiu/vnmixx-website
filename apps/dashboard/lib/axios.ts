/**
 * HTTP client (Axios) — `lib/` chỉ giữ tích hợp thư viện / instance dùng chung.
 * Biến môi trường nằm ở `@/config/constants`; Bearer + xử lý 401 đăng ký ngay dưới đây.
 */
import { API_BASE_URL } from '@/config/constants';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

/**
 * Axios instance configured for the API.
 * - withCredentials: sends HttpOnly cookies (refresh token) on every request.
 * - Authorization header is injected via interceptor from Zustand auth store.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const authInterceptorFlag = '__vnmixx_dashboard_auth_interceptors_registered__';
const globalContext = globalThis as typeof globalThis & Record<string, boolean | undefined>;
let refreshInFlight: Promise<string | null> | null = null;

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _hasRetriedAfterRefresh?: boolean;
}

interface RefreshApiSuccessResponse {
  success: true;
  data: {
    accessToken: string;
  };
}

interface RefreshApiErrorResponse {
  success: false;
  error: string;
}

type RefreshApiResponse = RefreshApiSuccessResponse | RefreshApiErrorResponse;

async function executeRefreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = (await response.json()) as RefreshApiResponse;
      if (!response.ok || !result.success) {
        return null;
      }
      return result.data.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function executeLogoutRedirect(): void {
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Request interceptor: injects Bearer token from Zustand
 * into every outgoing request.
 */
function registerAuthInterceptors(): void {
  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  /**
   * Response interceptor: use proxy.ts as single refresh source of truth.
   * - Automatically unwraps NestJS TransformInterceptor structure.
   * - Preserves { data, meta } for paginated results.
   * - Returns only data for single items.
   */
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      const { data } = response;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        // If it's a paginated response, it will have 'data' and 'meta' at the top level of the payload
        if ('meta' in data) {
          const { success: _, timestamp: __, ...payload } = data; // eslint-disable-line @typescript-eslint/no-unused-vars
          return { ...response, data: payload };
        }
        return { ...response, data: data.data };
      }
      return response;
    },
    async (error: AxiosError) => {
      const requestConfig = error.config as RetryableAxiosRequestConfig | undefined;
      const isUnauthorized = error.response?.status === 401;
      if (!isUnauthorized || !requestConfig || requestConfig._hasRetriedAfterRefresh) {
        return Promise.reject(error);
      }
      requestConfig._hasRetriedAfterRefresh = true;
      const refreshedAccessToken = await executeRefreshToken();
      if (!refreshedAccessToken) {
        executeLogoutRedirect();
        return Promise.reject(error);
      }
      useAuthStore.getState().setAccessToken(refreshedAccessToken);
      requestConfig.headers = requestConfig.headers ?? {};
      requestConfig.headers.Authorization = `Bearer ${refreshedAccessToken}`;
      return apiClient(requestConfig);
    },
  );
}

/** Chỉ trên browser — tránh gắn interceptor vào instance dùng trong Server Actions. */
if (typeof window !== 'undefined' && !globalContext[authInterceptorFlag]) {
  registerAuthInterceptors();
  globalContext[authInterceptorFlag] = true;
}
