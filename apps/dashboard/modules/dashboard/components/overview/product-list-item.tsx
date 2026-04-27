'use client';
/* eslint-disable @next/next/no-img-element */

import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import type { ReactNode } from 'react';

export function ProductListItem({
  leading,
  thumbnailUrl,
  title,
  tooltipTitle,
  subtitle,
  trailing,
}: {
  leading?: ReactNode;
  thumbnailUrl: string | null;
  title: string;
  tooltipTitle: string;
  subtitle: string;
  trailing: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1">
      <span className="inline-flex size-5 items-center justify-center text-xs font-semibold text-muted-foreground">
        {leading}
      </span>
      <div className="size-10 overflow-hidden rounded-md bg-muted">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="inline-flex size-full items-center justify-center text-xs font-semibold text-muted-foreground">
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="truncate text-sm font-medium">{title}</p>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltipTitle}</TooltipContent>
        </Tooltip>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {trailing}
    </div>
  );
}
