'use client';

import { Button, type ButtonProps } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type BackButtonProps = Omit<ButtonProps, 'type' | 'onClick'> & {
  label?: string;
  iconClassName?: string;
};

export function BackButton({
  label = 'Quay lại',
  className,
  iconClassName,
  variant = 'ghost',
  size = 'sm',
  ...props
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      onClick={() => router.back()}
      {...props}
    >
      <ArrowLeftIcon className={cn('size-4', iconClassName)} />
      {label}
    </Button>
  );
}
