import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth-store';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const authInterceptorFlag = '__vnmixx_dashboard_auth_interceptors_registered__';
const globalContext = globalThis as typeof globalThis & Record<string, boolean | undefined>;

/**
 * Request interceptor: injects Bearer token from Zustand
 * into every outgoing request.
 */
function registerAuthInterceptors(): void {
  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  /**
   * Response interceptor: use proxy.ts as single refresh source of truth.
   * On 401 this interceptor only clears local auth state and redirects.
   */
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const isUnauthorized = error.response?.status === 401;
      if (!isUnauthorized) {
        return Promise.reject(error);
      }
      useAuthStore.getState().clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );
}

if (!globalContext[authInterceptorFlag]) {
  registerAuthInterceptors();
  globalContext[authInterceptorFlag] = true;
}
