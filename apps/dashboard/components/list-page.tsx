'use client';

import { cn } from '@repo/ui/lib/utils';
import type { ReactNode } from 'react';

type ListPageProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  headerClassName?: string;
};

export function ListPage({ title, children, actions, className, headerClassName }: ListPageProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className={cn('flex flex-wrap items-end justify-between gap-4', headerClassName)}>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions ?? null}
      </div>
      {children}
    </div>
  );
}
