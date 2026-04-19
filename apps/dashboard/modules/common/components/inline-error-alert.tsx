'use client';

import { cn } from '@repo/ui/lib/utils';
import { AlertCircleIcon } from 'lucide-react';

type InlineErrorAlertProps = {
  message: string;
  className?: string;
};

export function InlineErrorAlert({ message, className }: InlineErrorAlertProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive',
        className,
      )}
      role="alert"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
