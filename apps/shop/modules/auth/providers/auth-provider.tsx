'use client';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import type { UserProfile } from '@/modules/auth/types/auth';
import { useEffect, useLayoutEffect, type ReactNode } from 'react';

interface AuthProviderProps {
  accessToken: string | null;
  children: ReactNode;
}

export function AuthProvider({ accessToken, children }: AuthProviderProps): React.JSX.Element {
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
        const { data } = await apiClient.get<UserProfile>('/me/profile');
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
