'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const THEME_STORAGE_KEY = 'dashboard-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme: 'light' | 'dark'): void {
  const rootElement = document.documentElement;
  rootElement.classList.remove('light', 'dark');
  rootElement.classList.add(theme);
  rootElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    const nextResolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(nextResolvedTheme);
    applyThemeClass(nextResolvedTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme !== 'system') {
      return;
    }
    function handleSystemThemeChange(event: MediaQueryListEvent): void {
      const changedTheme = event.matches ? 'dark' : 'light';
      setResolvedTheme(changedTheme);
      applyThemeClass(changedTheme);
    }
    mediaQueryList.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return themeContext;
}
