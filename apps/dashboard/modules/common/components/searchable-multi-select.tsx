'use client';

import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Input } from '@repo/ui/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

type SearchableMultiSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type SearchableMultiSelectProps<T extends string | number> = {
  options: readonly SearchableMultiSelectOption<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  'aria-invalid'?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  modal?: boolean;
};

export function SearchableMultiSelect<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Chọn…',
  searchPlaceholder = 'Tìm kiếm...',
  'aria-invalid': ariaInvalid,
  triggerClassName,
  contentClassName,
  align = 'start',
  modal = false,
}: SearchableMultiSelectProps<T>) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearchTerm));
  }, [options, normalizedSearchTerm]);
  const selectedOptions = useMemo(
    () =>
      value
        .map((selectedValue) => options.find((option) => option.value === selectedValue))
        .filter((option): option is SearchableMultiSelectOption<T> => option !== undefined),
    [options, value],
  );

  return (
    <Popover modal={modal}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || options.length === 0}
          className={cn(
            'h-auto min-h-9 w-full items-start justify-between gap-2 py-2 font-normal',
            triggerClassName,
          )}
          aria-invalid={ariaInvalid}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-left text-muted-foreground whitespace-normal wrap-break-word">
              {placeholder}
            </span>
          ) : (
            <span className="flex flex-1 flex-wrap items-center gap-1.5 text-left">
              {selectedOptions.map((option) => (
                <span
                  key={String(option.value)}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                >
                  <span>{option.label}</span>
                </span>
              ))}
            </span>
          )}
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          'z-300 w-[min(100vw-2rem,var(--radix-popover-trigger-width))] max-w-none p-0',
          contentClassName,
        )}
        onWheelCapture={(event) => event.stopPropagation()}
      >
        <div className="border-b p-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div
          className="max-h-60 overflow-y-auto overscroll-contain p-2"
          role="listbox"
          aria-multiselectable
          onWheelCapture={(event) => event.stopPropagation()}
        >
          {filteredOptions.map((option) => {
            const isChecked = value.includes(option.value);
            return (
              <label
                key={String(option.value)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(isNextChecked) => {
                    if (isNextChecked === true) {
                      if (!value.includes(option.value)) {
                        onChange([...value, option.value]);
                      }
                      return;
                    }
                    onChange(value.filter((id) => id !== option.value));
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Không tìm thấy kết quả.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
