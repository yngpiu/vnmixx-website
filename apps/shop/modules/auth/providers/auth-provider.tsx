'use client';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import type { UserProfile } from '@/modules/auth/types/auth';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

interface AuthProviderProps {
  accessToken: string | null;
  children: ReactNode;
}

/** Default `true`: guest (no token) is resolved; avoids hydration mismatch if a consumer reads before the provider value is applied. */
const AuthSessionReadyContext = createContext<boolean>(true);

/**
 * Whether guest/anonymous state is resolved or `/me/profile` has finished for this session.
 * Use before treating `user === null` as "must log in" on full reload while cookies exist.
 */
export function useAuthSessionReady(): boolean {
  return useContext(AuthSessionReadyContext);
}

export function AuthProvider({ accessToken, children }: AuthProviderProps): React.JSX.Element {
  const [isSessionReady, setIsSessionReady] = useState(() => !accessToken);
  useLayoutEffect(() => {
    if (accessToken) {
      useAuthStore.getState().setAccessToken(accessToken);
      setIsSessionReady(false);
    } else {
      useAuthStore.getState().clearSession();
      setIsSessionReady(true);
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
      } finally {
        if (!cancelled) {
          setIsSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);
  return (
    <AuthSessionReadyContext.Provider value={isSessionReady}>
      {children}
    </AuthSessionReadyContext.Provider>
  );
}
