import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Phân tích' };

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
