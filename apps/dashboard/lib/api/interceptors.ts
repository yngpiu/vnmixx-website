import { refreshAction } from '@/actions/auth';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth-store';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * Tracks whether a refresh is currently in progress
 * to avoid multiple concurrent refresh calls.
 */
let isRefreshing = false;

/**
 * Queue of requests that received 401 while a refresh was in progress.
 * They will be retried once the refresh completes.
 */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of failedQueue) {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  }
  failedQueue = [];
}

/**
 * Request interceptor: injects Bearer token from Zustand
 * into every outgoing request.
 */
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Response interceptor: catches 401 errors, calls refreshAction
 * (Server Action) to get a new token, and retries the original request.
 *
 * - Queues concurrent 401s so only one refresh call is made.
 * - On refresh failure: clears auth state and redirects to /login.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const isUnauthorized = error.response?.status === 401;
    if (!isUnauthorized || originalRequest._retry) {
      return Promise.reject(error);
    }
    // Another request is already refreshing — queue this one
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }
    originalRequest._retry = true;
    isRefreshing = true;
    try {
      const result = await refreshAction();
      if (!result.success) {
        throw new Error(result.error);
      }
      const { accessToken } = result.data;
      useAuthStore.getState().setAccessToken(accessToken);
      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      processQueue(refreshError, null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
