'use client';

import { FieldLabel } from '@repo/ui/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/ui/input-group';
import { cn } from '@repo/ui/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';

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
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const resolvedId = id ?? name;
  const isPasswordInput = inputProps.type === 'password';
  const resolvedInputType = isPasswordInput && isPasswordVisible ? 'text' : inputProps.type;
  return (
    <div className="space-y-2 w-full">
      <FieldLabel
        htmlFor={resolvedId}
        className={cn(labelClassName, 'text-[14px] leading-[24px] text-[#57585A] font-normal')}
      >
        {label}
      </FieldLabel>
      {isPasswordInput ? (
        <InputGroup className="h-[48px] rounded-[4px] border border-[#E7E8E9] bg-white">
          <InputGroupInput
            {...inputProps}
            id={resolvedId}
            type={resolvedInputType}
            name={name}
            aria-required={Boolean(required)}
            className={cn(
              'h-full px-[15px] py-[15px] text-[14px] leading-[16px] text-[#57585A] placeholder:text-muted-foreground/70',
              inputProps.className,
              inputClassName,
            )}
          />
          <InputGroupAddon align="inline-end" className="pr-[15px]">
            <InputGroupButton
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              {isPasswordVisible ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <input
          {...inputProps}
          id={resolvedId}
          name={name}
          aria-required={Boolean(required)}
          className={cn(LABELED_INPUT_CLASS_NAME, inputProps.className, inputClassName)}
        />
      )}
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
