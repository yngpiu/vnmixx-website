'use client';

import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import type { Table } from '@tanstack/react-table';
import { XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>;
  entityName: string;
  children: ReactNode;
};

export function DataTableBulkActions<TData>({
  table,
  entityName,
  children,
}: DataTableBulkActionsProps<TData>): ReactNode {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (selectedCount > 0) {
      const message = `${selectedCount} ${entityName} đã chọn. Thanh thao tác hàng loạt.`;
      queueMicrotask(() => {
        setAnnouncement(message);
      });
      const timer = setTimeout(() => setAnnouncement(''), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [selectedCount, entityName]);

  const handleClearSelection = () => {
    table.resetRowSelection();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const buttons = toolbarRef.current?.querySelectorAll('button');
    if (!buttons) {
      return;
    }

    const currentIndex = Array.from(buttons).findIndex(
      (button) => button === document.activeElement,
    );

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex]?.focus();
        break;
      }
      case 'Home':
        event.preventDefault();
        buttons[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
      case 'Escape': {
        const target = event.target as HTMLElement;
        const activeElement = document.activeElement as HTMLElement;
        const isFromDropdownTrigger =
          target?.getAttribute('data-slot') === 'dropdown-menu-trigger' ||
          activeElement?.getAttribute('data-slot') === 'dropdown-menu-trigger' ||
          target?.closest('[data-slot="dropdown-menu-trigger"]') ||
          activeElement?.closest('[data-slot="dropdown-menu-trigger"]');
        const isFromDropdownContent =
          activeElement?.closest('[data-slot="dropdown-menu-content"]') ||
          target?.closest('[data-slot="dropdown-menu-content"]');

        if (isFromDropdownTrigger || isFromDropdownContent) {
          return;
        }
        event.preventDefault();
        handleClearSelection();
        break;
      }
      default:
        break;
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {announcement}
      </div>

      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={`Thao tác hàng loạt cho ${selectedCount} ${entityName} đã chọn`}
        aria-describedby="bulk-actions-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl',
          'transition-all delay-100 duration-300 ease-out hover:scale-[1.02]',
          'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-x-2 rounded-xl border p-2 shadow-xl',
            'bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60',
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={handleClearSelection}
                className="size-6 rounded-full"
                aria-label="Bỏ chọn"
                title="Bỏ chọn (Escape)"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Bỏ chọn</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bỏ chọn (Escape)</p>
            </TooltipContent>
          </Tooltip>

          <Separator className="h-5" orientation="vertical" aria-hidden />

          <div className="flex items-center gap-x-1 text-sm" id="bulk-actions-description">
            <Badge
              variant="default"
              className="min-w-8 rounded-lg"
              aria-label={`${selectedCount} đã chọn`}
            >
              {selectedCount}
            </Badge>{' '}
            <span className="hidden sm:inline">{entityName}</span>{' '}
            <span className="text-muted-foreground">đã chọn</span>
          </div>

          <Separator className="h-5" orientation="vertical" aria-hidden />

          {children}
        </div>
      </div>
    </>
  );
}
