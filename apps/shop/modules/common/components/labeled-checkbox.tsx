'use client';

import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import { Label } from '@repo/ui/components/ui/label';

export interface LabeledCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  invalid?: boolean;
}

export function LabeledCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  error,
  invalid,
}: LabeledCheckboxProps): React.JSX.Element {
  const hasError = Boolean(invalid || error);
  return (
    <Field data-invalid={hasError} className="gap-0">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(nextValue) => onCheckedChange(nextValue === true)}
          disabled={disabled}
          aria-invalid={hasError}
        />
        <Label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </Label>
      </div>
      {error ? <FieldError className="mt-1" errors={[{ message: error }]} /> : null}
    </Field>
  );
}
