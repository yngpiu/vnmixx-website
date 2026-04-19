'use client';

import '@/lib/api/interceptors';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth-store';
import type { UserProfile } from '@/types/auth';
import { useEffect, useLayoutEffect, type ReactNode } from 'react';

interface AuthProviderProps {
  /** Access token read from server-side cookie, passed down from layout. */
  accessToken: string | null;
  children: ReactNode;
}

/**
 * Đồng bộ token từ cookie vào Zustand, gọi GET /auth/me để có profile ở client
 * (footer sidebar, v.v.) kể cả sau F5.
 */
export function AuthProvider({ accessToken, children }: AuthProviderProps) {
  useLayoutEffect(() => {
    if (accessToken) {
      useAuthStore.getState().setAccessToken(accessToken);
    } else {
      useAuthStore.getState().clearSession();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await apiClient.get<UserProfile>('/auth/me');
        if (!cancelled) {
          useAuthStore.getState().setUser(data);
        }
      } catch {
        if (!cancelled) {
          useAuthStore.getState().setUser(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return <>{children}</>;
}
