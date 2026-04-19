'use client';

import { listEmployees } from '@/modules/employees/api/employees';
import type { EmployeeListItem } from '@/modules/employees/types/employee';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@repo/ui/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { Separator } from '@repo/ui/components/ui/separator';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Column } from '@tanstack/react-table';
import { CheckIcon, PlusCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const PAGE_SIZE = 25;

type EmployeeInfiniteColumnFilterProps<TData> = {
  column: Column<TData, unknown> | undefined;
  title?: string;
};

/**
 * Lọc theo nhân viên: tái sử dụng `GET /admin/employees` với page/limit, tìm kiếm server,
 * cuộn danh sách để tải trang tiếp theo (infinite scroll trong popover).
 */
export function EmployeeInfiniteColumnFilter<TData>({
  column,
  title = 'Nhân viên',
}: EmployeeInfiniteColumnFilterProps<TData>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timerId);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ['employees', 'infinite-column-filter', debouncedSearch],
    queryFn: ({ pageParam }) =>
      listEmployees({
        page: pageParam,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: 'ACTIVE',
        isSoftDeleted: false,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: open && column !== undefined,
  });

  const flatEmployees = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<number>();
    const rows: EmployeeListItem[] = [];
    for (const page of pages) {
      for (const e of page.data) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        rows.push(e);
      }
    }
    return rows;
  }, [query.data]);

  useEffect(() => {
    if (!open) return;
    const element = listScrollRef.current;
    if (!element) return;
    const onScroll = (): void => {
      if (!query.hasNextPage || query.isFetchingNextPage) return;
      const { scrollTop, scrollHeight, clientHeight } = element;
      if (scrollHeight - scrollTop - clientHeight < 120) {
        void query.fetchNextPage();
      }
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [open, query]);

  if (!column) {
    return null;
  }

  const selectedValues = new Set((column.getFilterValue() as string[] | undefined) ?? []);
  const selectedEntries = [...selectedValues].map((id) => {
    const row = flatEmployees.find((e) => String(e.id) === id);
    return {
      id,
      label: row ? `${row.fullName} (${row.email})` : `Nhân viên #${id}`,
    };
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSearch('');
          setDebouncedSearch('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircleIcon className="size-4" />
          {title}
          {selectedValues.size > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} đã chọn
                  </Badge>
                ) : (
                  selectedEntries.map((entry) => (
                    <Badge
                      variant="secondary"
                      key={entry.id}
                      className="max-w-56 rounded-sm px-1 font-normal"
                    >
                      <span className="truncate">{entry.label}</span>
                    </Badge>
                  ))
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Tìm ${title.toLowerCase()}…`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={listScrollRef} className="max-h-72">
            <CommandGroup>
              {flatEmployees.map((e) => {
                const value = String(e.id);
                const isSelected = selectedValues.has(value);
                const label = `${e.fullName} (${e.email})`;
                return (
                  <CommandItem
                    key={e.id}
                    value={value}
                    keywords={[e.fullName, e.email]}
                    onSelect={() => {
                      const next = new Set(selectedValues);
                      if (isSelected) {
                        next.delete(value);
                      } else {
                        next.add(value);
                      }
                      column.setFilterValue(next.size > 0 ? [...next] : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <CheckIcon className="size-4 text-background" />
                    </div>
                    <span className="line-clamp-2">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {query.isFetchingNextPage ? (
              <p className="text-muted-foreground px-2 py-2 text-center text-xs">Đang tải thêm…</p>
            ) : null}
            <CommandEmpty>{query.isLoading ? 'Đang tải…' : 'Không có kết quả.'}</CommandEmpty>
            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      column.setFilterValue(undefined);
                    }}
                    className="justify-center text-center"
                  >
                    Xóa bộ lọc
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
