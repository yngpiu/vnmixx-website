'use client';

import { getDashboardSearchEntries } from '@/config/sidebar-menu';
import { Button } from '@repo/ui/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command';
import { cn } from '@repo/ui/lib/utils';
import { ArrowRightIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

const COMMAND_ENTRIES = getDashboardSearchEntries();

const GROUP_ORDER = (): readonly string[] => {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const e of COMMAND_ENTRIES) {
    if (!seen.has(e.group)) {
      seen.add(e.group);
      order.push(e.group);
    }
  }
  return order;
};

function groupEntriesByGroup(
  entries: readonly { label: string; href: string; group: string }[],
): Map<string, { label: string; href: string }[]> {
  const map = new Map<string, { label: string; href: string }[]>();
  for (const e of entries) {
    const list = map.get(e.group) ?? [];
    list.push({ label: e.label, href: e.href });
    map.set(e.group, list);
  }
  return map;
}

function useModKeyLabel(): string {
  const [label, setLabel] = useState('Ctrl+K');
  useEffect(() => {
    const isApple = /Mac|iPhone|iPad|iPod/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
    );
    setLabel(isApple ? '⌘K' : 'Ctrl+K');
  }, []);
  return label;
}

type DashboardSearchCommandProps = {
  readonly className?: string;
};

/** Renders nested labels with chevrons like `A > B > C`. */
function formatCommandLabel(label: string): ReactNode {
  const parts = label
    .split(' — ')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return label;
  }
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {index > 0 ? (
        <ChevronRightIcon
          className="mx-0.5 inline size-3.5 shrink-0 text-muted-foreground opacity-70"
          aria-hidden
        />
      ) : null}
      <span>{part}</span>
    </Fragment>
  ));
}

/**
 * Header search trigger opening a command palette for quick navigation (shadcn-admin style).
 */
export function DashboardSearchCommand({ className }: DashboardSearchCommandProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const modKeyLabel = useModKeyLabel();
  const grouped = useMemo(() => groupEntriesByGroup(COMMAND_ENTRIES), []);
  const groupOrder = useMemo(() => GROUP_ORDER(), []);

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'relative h-9 w-full max-w-xl justify-start gap-2 text-muted-foreground shadow-none sm:pr-10',
          className,
        )}
        aria-label="Mở tìm kiếm điều hướng"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate text-left text-sm font-normal">Tìm trang hoặc thao tác…</span>
        <kbd className="bg-muted pointer-events-none absolute right-1.5 top-1/2 hidden h-6 -translate-y-1/2 select-none items-center rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
          {modKeyLabel}
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Tìm trong dashboard"
        className="top-[28%] max-w-[min(100vw-2rem,28rem)] sm:max-w-lg"
      >
        <Command shouldFilter loop>
          <CommandInput
            placeholder="Nhập lệnh hoặc tìm kiếm…"
            trailingClose
            onTrailingClose={() => {
              setOpen(false);
            }}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            {groupOrder.map((groupName) => {
              const items = grouped.get(groupName);
              if (!items?.length) return null;
              return (
                <CommandGroup key={groupName} heading={groupName}>
                  {items.map((entry) => (
                    <CommandItem
                      key={`${groupName}-${entry.href}-${entry.label}`}
                      value={`${entry.label} ${entry.href} ${groupName}`}
                      showSelectionIndicator={false}
                      onSelect={() => {
                        navigateTo(entry.href);
                      }}
                    >
                      <ArrowRightIcon
                        className="size-4 shrink-0 text-muted-foreground opacity-80"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {formatCommandLabel(entry.label)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
