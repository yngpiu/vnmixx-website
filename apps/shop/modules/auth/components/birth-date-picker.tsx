'use client';

import { LabeledDatePicker } from '@/modules/common/components/labeled-date-picker';

export interface BirthDatePickerProps {
  label: string;
  name: string;
  required?: boolean;
  placeholder: string;
  value?: string;
  onValueChange: (value?: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

export function BirthDatePicker({
  label,
  name,
  required,
  placeholder,
  value,
  onValueChange,
  disabled,
  invalid,
  className,
}: BirthDatePickerProps): React.JSX.Element {
  return (
    <LabeledDatePicker
      label={label}
      name={name}
      required={required}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      invalid={invalid}
      className={className}
    />
  );
}
