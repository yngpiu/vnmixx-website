'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@repo/ui/components/ui/sheet';
import { useEffect } from 'react';

type CategoryCatalogFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
};

/**
 * Mobile / tablet filter drawer; closes when viewport reaches `lg` (min-width 1024px).
 */
export function CategoryCatalogFiltersSheet({
  open,
  onOpenChange,
  title = 'Bộ lọc',
  children,
}: CategoryCatalogFiltersSheetProps): React.JSX.Element {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const closeWhenDesktop = (): void => {
      if (mediaQuery.matches) {
        onOpenChange(false);
      }
    };
    closeWhenDesktop();
    mediaQuery.addEventListener('change', closeWhenDesktop);
    return (): void => {
      mediaQuery.removeEventListener('change', closeWhenDesktop);
    };
  }, [onOpenChange]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 pt-4 pb-3">
          <SheetTitle className="text-left">{title}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
