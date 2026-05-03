'use client';

import { Field, FieldError } from '@repo/ui/components/ui/field';
import { Label } from '@repo/ui/components/ui/label';

export type LabeledRadioGroupOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};

export interface LabeledRadioGroupProps<TValue extends string = string> {
  label: string;
  value: TValue;
  options: LabeledRadioGroupOption<TValue>[];
  onValueChange: (value: TValue) => void;
  disabled?: boolean;
  error?: string;
  invalid?: boolean;
}

export function LabeledRadioGroup<TValue extends string = string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
  error,
  invalid,
}: LabeledRadioGroupProps<TValue>): React.JSX.Element {
  const hasError = Boolean(invalid || error);
  return (
    <Field data-invalid={hasError} className="gap-0">
      <div className="space-y-2 w-full">
        <Label className="text-[14px] leading-[24px] text-[#57585A] font-normal">{label}</Label>
        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex h-[48px] items-center gap-3 rounded-[4px] border border-border bg-white px-[15px] py-[15px] text-[14px] leading-[16px] text-[#57585A]"
            >
              <input
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={() => onValueChange(option.value)}
                disabled={disabled}
                aria-invalid={hasError}
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      {error ? <FieldError className="mt-1" errors={[{ message: error }]} /> : null}
    </Field>
  );
}
