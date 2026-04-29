'use client';

import { LabeledInputSelect } from '@/modules/common/components/labeled-input-select';
import { useMemo } from 'react';

export type GenderValue = 'MALE' | 'FEMALE' | 'OTHER';

export interface GenderSelectProps {
  name: string;
  label: string;
  required?: boolean;
  value?: GenderValue;
  disabled?: boolean;
  invalid?: boolean;
  onValueChange: (value: GenderValue) => void;
  className?: string;
  labelClassName?: string;
}

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
] as const;

export function GenderSelect({
  name,
  label,
  required: _required,
  value,
  disabled,
  invalid,
  onValueChange,
  className,
  labelClassName,
}: GenderSelectProps): React.JSX.Element {
  const selected = value ?? 'FEMALE';

  const selectedLabel = useMemo(() => {
    return GENDER_OPTIONS.find((o) => o.value === selected)?.label ?? 'Nữ';
  }, [selected]);

  return (
    <>
      <LabeledInputSelect<GenderValue>
        label={label}
        name={name}
        value={selected}
        onValueChange={onValueChange}
        options={GENDER_OPTIONS}
        placeholder="Chọn"
        disabled={disabled}
        invalid={Boolean(invalid)}
        required={Boolean(_required)}
        labelClassName={labelClassName}
        triggerClassName={className}
      />
      <span className="sr-only">{selectedLabel}</span>
    </>
  );
}
