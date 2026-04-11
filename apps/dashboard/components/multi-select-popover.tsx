'use client';

import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export type MultiSelectPopoverOption<T extends string | number = number> = {
  value: T;
  label: string;
};

export type MultiSelectPopoverProps<T extends string | number = number> = {
  options: readonly MultiSelectPopoverOption<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-invalid'?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  /** Radix: `false` giúp dùng trong Dialog không bị kẹt focus. @default false */
  modal?: boolean;
};

export function MultiSelectPopover<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Chọn…',
  'aria-invalid': ariaInvalid,
  triggerClassName,
  contentClassName,
  align = 'start',
  modal = false,
}: MultiSelectPopoverProps<T>) {
  const summary =
    value.length === 0
      ? placeholder
      : value
          .map((v) => options.find((o) => o.value === v)?.label)
          .filter(Boolean)
          .join(', ');

  return (
    <Popover modal={modal}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || options.length === 0}
          className={cn(
            'h-auto min-h-9 w-full justify-between gap-2 py-2 font-normal',
            triggerClassName,
          )}
          aria-invalid={ariaInvalid}
        >
          <span
            className={
              value.length === 0
                ? 'line-clamp-2 text-left text-muted-foreground'
                : 'line-clamp-2 text-left text-foreground'
            }
          >
            {summary}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          'z-300 w-[min(100vw-2rem,var(--radix-popover-trigger-width))] max-w-none p-0',
          contentClassName,
        )}
      >
        <div className="max-h-60 overflow-y-auto p-2" role="listbox" aria-multiselectable>
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label
                key={String(option.value)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    if (v === true) {
                      if (!value.includes(option.value)) {
                        onChange([...value, option.value]);
                      }
                    } else {
                      onChange(value.filter((id) => id !== option.value));
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
