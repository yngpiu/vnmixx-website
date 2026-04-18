'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
}

function getOrCreateSessionKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  let key = window.localStorage.getItem('vnmixx_sid');
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem('vnmixx_sid', key);
  }
  return key;
}

/**
 * Gửi beacon lên API khi route shop thay đổi (POST /shop/page-visits).
 */
export function PageVisitTracker(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef<string>('');
  useEffect(() => {
    const query = searchParams.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    if (fullPath === previousPathRef.current) {
      return;
    }
    previousPathRef.current = fullPath;
    const sessionKey = getOrCreateSessionKey();
    const payload = {
      path: fullPath.slice(0, 500),
      referrer:
        typeof document !== 'undefined' && document.referrer
          ? document.referrer.slice(0, 500)
          : undefined,
      sessionKey: sessionKey || undefined,
    };
    void fetch(`${getApiBaseUrl()}/shop/page-visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  }, [pathname, searchParams]);
  return null;
}
