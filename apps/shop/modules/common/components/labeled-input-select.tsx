'use client';

import { Field, FieldError, FieldLabel } from '@repo/ui/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { cn } from '@repo/ui/lib/utils';
import type { ReactNode } from 'react';

export type LabeledInputSelectOption<TValue extends string = string> = {
  value: TValue;
  label: ReactNode;
};

export interface LabeledInputSelectProps<TValue extends string = string> {
  label: string;
  name: string;
  value?: TValue;
  onValueChange: (value: TValue) => void;
  options: LabeledInputSelectOption<TValue>[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  required?: boolean;
  labelClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function LabeledInputSelect<TValue extends string = string>({
  label,
  name,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  invalid,
  error,
  required,
  labelClassName,
  triggerClassName,
  contentClassName,
}: LabeledInputSelectProps<TValue>): React.JSX.Element {
  const selectedValue = value;

  const hasError = Boolean(invalid || error);
  return (
    <Field data-invalid={hasError} className="gap-0">
      <div className="space-y-2 w-full">
        <FieldLabel
          htmlFor={`${name}-select`}
          className={cn(labelClassName, 'text-[14px] leading-[24px] text-[#57585A] font-normal')}
        >
          {label}
        </FieldLabel>

        <Select
          value={selectedValue}
          onValueChange={(v) => onValueChange(v as TValue)}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${name}-select`}
            aria-required={Boolean(required)}
            aria-invalid={hasError}
            className={cn(
              // Override `@repo/ui` defaults so trigger matches our input.
              'w-full h-10! md:h-12! min-w-0 rounded-[4px] border border-[#E7E8E9] bg-white ' +
                'px-[12px] md:px-[15px] py-[10px] md:py-[15px] text-[14px] leading-[16px] shadow-none ' +
                'focus-visible:ring-0 focus-visible:border-[#E7E8E9] ' +
                'data-placeholder:text-[#8C8D90] data-placeholder:opacity-100!',
              hasError ? 'border-destructive! text-destructive' : undefined,
              triggerClassName,
            )}
          >
            <SelectValue placeholder={placeholder ?? 'Chọn'} />
          </SelectTrigger>

          <SelectContent
            position="item-aligned"
            align="start"
            className={cn(
              // Match the dropdown frame with the input.
              'bg-white border border-[#E7E8E9] rounded-[4px] shadow-none ring-0 ' +
                'w-(--radix-select-trigger-width) p-1!',

              contentClassName,
            )}
          >
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="rounded-[4px]!">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <FieldError className="mt-1" errors={[{ message: error }]} /> : null}
      </div>
    </Field>
  );
}
