import type { UserProfile } from '@/modules/auth/types/auth';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  /** JWT access token for client-side API calls. */
  accessToken: string | null;
  /** Authenticated user profile. */
  user: UserProfile | null;
}

interface AuthActions {
  /** Set only the access token (used by AuthProvider on mount). */
  setAccessToken: (accessToken: string) => void;
  /** Cập nhật profile (sau GET /admin/me/profile hoặc làm mới hồ sơ). */
  setUser: (user: UserProfile | null) => void;
  /** Set access token and user profile together (used after login). */
  setSession: (accessToken: string, user: UserProfile) => void;
  /** Clear all auth state (logout). */
  clearSession: () => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Client-side auth store.
 * Token comes from server cookie (via AuthProvider).
 * User profile is set after login hoặc khi AuthProvider gọi /admin/me/profile.
 * No persistence — server cookies are the source of truth.
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (accessToken: string) =>
        set({ accessToken }, undefined, 'auth/setAccessToken'),
      setUser: (user: UserProfile | null) => set({ user }, undefined, 'auth/setUser'),
      setSession: (accessToken: string, user: UserProfile) =>
        set({ accessToken, user }, undefined, 'auth/setSession'),
      clearSession: () => set({ accessToken: null, user: null }, undefined, 'auth/clearSession'),
    }),
    {
      name: 'AuthStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
