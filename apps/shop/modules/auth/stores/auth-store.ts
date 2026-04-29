import type { UserProfile } from '@/modules/auth/types/auth';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isAuthInitialized: boolean;
}

interface AuthActions {
  setAccessToken: (accessToken: string) => void;
  setUser: (user: UserProfile | null) => void;
  setSession: (accessToken: string, user: UserProfile) => void;
  clearSession: () => void;
  setAuthInitialized: (isInitialized: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthInitialized: false,
      setAccessToken: (accessToken: string) =>
        set({ accessToken }, undefined, 'shop-auth/setAccessToken'),
      setUser: (user: UserProfile | null) => set({ user }, undefined, 'shop-auth/setUser'),
      setSession: (accessToken: string, user: UserProfile) =>
        set({ accessToken, user }, undefined, 'shop-auth/setSession'),
      clearSession: () =>
        set({ accessToken: null, user: null }, undefined, 'shop-auth/clearSession'),
      setAuthInitialized: (isInitialized: boolean) =>
        set({ isAuthInitialized: isInitialized }, undefined, 'shop-auth/setAuthInitialized'),
    }),
    {
      name: 'ShopAuthStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
