'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { useCallback, useRef, useState, type ReactNode } from 'react';

type LongTextProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function checkOverflow(textContainer: HTMLDivElement | null): boolean {
  if (!textContainer) {
    return false;
  }
  return (
    textContainer.offsetHeight < textContainer.scrollHeight ||
    textContainer.offsetWidth < textContainer.scrollWidth
  );
}

export function LongText({ children, className = '', contentClassName = '' }: LongTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflown, setIsOverflown] = useState(false);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (node && checkOverflow(node)) {
      queueMicrotask(() => setIsOverflown(true));
    }
  }, []);

  if (!isOverflown) {
    return (
      <div ref={refCallback} className={cn('truncate', className)}>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Tooltip>
          <TooltipTrigger asChild>
            <div ref={refCallback} className={cn('truncate', className)}>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className={contentClassName}>{children}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <div ref={refCallback} className={cn('truncate', className)}>
              {children}
            </div>
          </PopoverTrigger>
          <PopoverContent className={cn('w-fit', contentClassName)}>
            <p>{children}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
