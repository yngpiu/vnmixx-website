'use client';

import { FieldLabel } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';

export interface LabeledInputProps extends Omit<React.ComponentProps<'input'>, 'size' | 'name'> {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const LABELED_INPUT_CLASS_NAME =
  'h-[48px] w-full box-border rounded-[4px] border border-[#E7E8E9] bg-white px-[15px] py-[15px] ' +
  'text-[14px] leading-[16px] text-[#57585A] shadow-none placeholder:text-muted-foreground/70 ' +
  'focus-visible:ring-0 focus-visible:border-[#E7E8E9] disabled:bg-input/50 disabled:opacity-50';

export function LabeledInput({
  label,
  name,
  required,
  hint,
  labelClassName,
  inputClassName,
  id,
  ...inputProps
}: LabeledInputProps): React.JSX.Element {
  const resolvedId = id ?? name;
  return (
    <div className="space-y-2 w-full">
      <FieldLabel
        htmlFor={resolvedId}
        className={cn(labelClassName, 'text-[14px] leading-[24px] text-[#57585A] font-normal')}
      >
        {label}
      </FieldLabel>
      <input
        {...inputProps}
        id={resolvedId}
        name={name}
        aria-required={Boolean(required)}
        className={cn(LABELED_INPUT_CLASS_NAME, inputProps.className, inputClassName)}
      />
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
