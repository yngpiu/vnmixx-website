'use client';

import {
  getAuditLogActionFilterTree,
  type AuditLogActionFilterGroup,
} from '@/modules/audit-logs/utils/audit-log-action-label';
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
import type { Column } from '@tanstack/react-table';
import { CheckIcon, PlusCircleIcon } from 'lucide-react';
import { useMemo } from 'react';

type AuditLogActionTreeFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  title?: string;
};

function buildFlatLookup(groups: AuditLogActionFilterGroup[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of groups) {
    for (const item of g.items) {
      m.set(item.value, item.label);
    }
  }
  return m;
}

/**
 * Lọc hành động audit dạng cây: nhóm theo tài nguyên (Sản phẩm, Danh mục, …), trong nhóm là từng mã.
 */
export function AuditLogActionTreeFilter<TData, TValue>({
  column,
  title = 'Hành động',
}: AuditLogActionTreeFilterProps<TData, TValue>) {
  const groups = useMemo(() => getAuditLogActionFilterTree(), []);
  const labelByValue = useMemo(() => buildFlatLookup(groups), [groups]);

  const selectedValues = new Set((column?.getFilterValue() as string[] | undefined) ?? []);

  return (
    <Popover>
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
                  Array.from(selectedValues).map((value) => (
                    <Badge variant="secondary" key={value} className="rounded-sm px-1 font-normal">
                      {labelByValue.get(value) ?? value}
                    </Badge>
                  ))
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>Không có kết quả.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.groupKey} heading={group.groupLabel}>
                {group.items.map((option) => {
                  const isSelected = selectedValues.has(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${group.groupKey} ${option.value} ${option.label}`}
                      keywords={[group.groupLabel, option.label, option.value]}
                      showSelectionIndicator={false}
                      onSelect={() => {
                        if (isSelected) {
                          selectedValues.delete(option.value);
                        } else {
                          selectedValues.add(option.value);
                        }
                        const filterValues = Array.from(selectedValues);
                        column?.setFilterValue(filterValues.length ? filterValues : undefined);
                      }}
                      className="gap-2 ps-4"
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
                      <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    showSelectionIndicator={false}
                    onSelect={() => column?.setFilterValue(undefined)}
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
