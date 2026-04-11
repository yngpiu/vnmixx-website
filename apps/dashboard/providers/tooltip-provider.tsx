'use client';

import { TooltipProvider } from '@repo/ui/components/ui/tooltip';
import type { ReactNode } from 'react';

/** Bọc app để Radix Tooltip (dùng trong sidebar khi thu gọn icon) hoạt động. */
export function DashboardTooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
