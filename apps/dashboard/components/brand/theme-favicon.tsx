'use client';

import { useTheme } from '@/providers/theme-provider';
import { useEffect } from 'react';

/**
 * Cập nhật favicon đã khai báo trong `metadata` theo `resolvedTheme` (class `dark` trên html).
 */
export function ThemeFavicon(): null {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const href =
      resolvedTheme === 'dark' ? '/images/favicon-dark.png' : '/images/favicon-light.png';
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = href;
    }
  }, [resolvedTheme]);

  return null;
}
