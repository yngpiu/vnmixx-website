'use client';

import { Calendar } from '@repo/ui/components/ui/calendar';
import { Field, FieldError, FieldLabel } from '@repo/ui/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { cn } from '@repo/ui/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const LABELED_DATE_TRIGGER_CLASS_NAME =
  'h-10 md:h-12 w-full box-border rounded-[4px] border border-[#E7E8E9] bg-white px-[12px] md:px-[15px] py-[10px] md:py-[15px] ' +
  'text-[14px] leading-[16px] text-[#57585A] shadow-none placeholder:text-muted-foreground/70 ' +
  'focus-visible:ring-0 focus-visible:border-[#E7E8E9] disabled:bg-input/50 disabled:opacity-50';

function formatDateToYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseYyyyMmDdToDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number.parseInt(match[1]!, 10);
  const monthIndex = Number.parseInt(match[2]!, 10) - 1;
  const day = Number.parseInt(match[3]!, 10);
  const d = new Date(year, monthIndex, day);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface LabeledDatePickerProps {
  label: string;
  name: string;
  required?: boolean;
  placeholder: string;
  value?: string;
  onValueChange: (value?: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  className?: string;
}

export function LabeledDatePicker({
  label,
  name,
  required: _required,
  placeholder,
  value,
  onValueChange,
  disabled,
  invalid,
  error,
  className,
}: LabeledDatePickerProps): React.JSX.Element {
  const parsedDate = useMemo(() => (value ? parseYyyyMmDdToDate(value) : undefined), [value]);

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(parsedDate);

  useEffect(() => {
    setSelectedDate(parsedDate);
  }, [parsedDate]);

  const formattedValue = useMemo(() => {
    return selectedDate ? formatDateToYyyyMmDd(selectedDate) : '';
  }, [selectedDate]);

  const handleSelect = (date: Date | undefined): void => {
    const next = date ? new Date(date) : undefined;
    setSelectedDate(next);
    onValueChange(next ? formatDateToYyyyMmDd(next) : undefined);
    setOpen(false);
  };

  const hasError = Boolean(invalid || error);
  return (
    <Field data-invalid={hasError} className="gap-0">
      <div className="space-y-2 w-full">
        <FieldLabel
          htmlFor={`${name}-picker`}
          className={cn('text-[14px] leading-[24px] text-[#57585A] font-normal')}
        >
          {label}
        </FieldLabel>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={`${name}-picker`}
              type="button"
              aria-disabled={disabled}
              disabled={disabled}
              aria-required={Boolean(_required)}
              aria-invalid={hasError}
              className={cn(
                LABELED_DATE_TRIGGER_CLASS_NAME,
                'flex w-full items-center justify-between gap-3',
                hasError ? 'border-destructive text-destructive' : undefined,
                disabled ? 'cursor-not-allowed' : undefined,
                className,
              )}
            >
              <span
                className={cn(
                  'min-w-0 truncate',
                  formattedValue ? 'text-foreground' : 'text-muted-foreground/70',
                )}
              >
                {formattedValue ? formattedValue : placeholder}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0 bg-white border border-[#E7E8E9] shadow-none rounded-[4px]"
            align="start"
          >
            <Calendar
              className="bg-white! p-2!"
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              initialFocus
              captionLayout="dropdown"
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
        {error ? <FieldError className="mt-1" errors={[{ message: error }]} /> : null}
      </div>
    </Field>
  );
}
