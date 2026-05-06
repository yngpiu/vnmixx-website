'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CartDrawer = dynamic(
  () => import('@/modules/cart/components/cart-drawer').then((module) => module.CartDrawer),
  { ssr: false },
);
const SupportChatFabSheet = dynamic(
  () =>
    import('@/modules/support-chat/components/support-chat-fab-sheet').then(
      (module) => module.SupportChatFabSheet,
    ),
  { ssr: false },
);
const Toaster = dynamic(
  () => import('@repo/ui/components/ui/sonner').then((module) => module.Toaster),
  { ssr: false },
);

export function LazyGlobalOverlays(): React.JSX.Element | null {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const markReady = (): void => setIsReady(true);
    if (typeof browserWindow.requestIdleCallback === 'function') {
      const idleHandle = browserWindow.requestIdleCallback(markReady, { timeout: 1200 });
      return () => {
        if (typeof browserWindow.cancelIdleCallback === 'function') {
          browserWindow.cancelIdleCallback(idleHandle);
        }
      };
    }
    const timeoutHandle = window.setTimeout(markReady, 700);
    return () => window.clearTimeout(timeoutHandle);
  }, []);
  if (!isReady) {
    return null;
  }
  return (
    <>
      <CartDrawer />
      <SupportChatFabSheet />
      <Toaster richColors closeButton position="bottom-right" theme="light" />
    </>
  );
}
