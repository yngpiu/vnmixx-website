'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRef, type ReactNode } from 'react';

interface AuthProviderProps {
  /** Access token read from server-side cookie, passed down from layout. */
  accessToken: string | null;
  children: ReactNode;
}

/**
 * Syncs the server-provided access token into the Zustand store
 * so client-side API calls (via axios interceptor) can use it.
 * Runs once on mount — subsequent token updates come from
 * the refresh interceptor or login mutation.
 */
export function AuthProvider({ accessToken, children }: AuthProviderProps) {
  const isInitialized = useRef(false);
  if (!isInitialized.current) {
    if (accessToken) {
      useAuthStore.getState().setAccessToken(accessToken);
    }
    isInitialized.current = true;
  }
  return <>{children}</>;
}
