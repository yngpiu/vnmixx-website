'use client';

import { Button } from '@repo/ui/components/ui/button';
import { Calendar } from '@repo/ui/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import type { RangePreset } from './dashboard-overview.utils';
import { getRangeByPreset, shortDateFormatter } from './dashboard-overview.utils';

type DateRangeFilterProps = {
  preset: RangePreset;
  setPreset: (preset: RangePreset) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};

export function DateRangeFilter({
  preset,
  setPreset,
  dateRange,
  setDateRange,
}: DateRangeFilterProps) {
  const dateRangeLabel = dateRange?.from
    ? dateRange.to
      ? `${shortDateFormatter.format(dateRange.from)} - ${shortDateFormatter.format(dateRange.to)}`
      : shortDateFormatter.format(dateRange.from)
    : 'Chọn khoảng thời gian';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[260px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 size-4" />
          <span suppressHydrationWarning>{dateRangeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex w-[140px] flex-col gap-1 border-r p-2">
            <Button
              variant={preset === 'today' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => {
                setPreset('today');
                setDateRange(getRangeByPreset('today'));
              }}
            >
              Hôm nay
            </Button>
            <Button
              variant={preset === 'yesterday' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => {
                setPreset('yesterday');
                setDateRange(getRangeByPreset('yesterday'));
              }}
            >
              Hôm qua
            </Button>
            <Button
              variant={preset === 'this_week' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => {
                setPreset('this_week');
                setDateRange(getRangeByPreset('this_week'));
              }}
            >
              Tuần này
            </Button>
            <Button
              variant={preset === 'this_month' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => {
                setPreset('this_month');
                setDateRange(getRangeByPreset('this_month'));
              }}
            >
              Tháng này
            </Button>
            <Button
              variant={preset === 'this_year' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => {
                setPreset('this_year');
                setDateRange(getRangeByPreset('this_year'));
              }}
            >
              Năm này
            </Button>
          </div>
          <Calendar
            initialFocus
            mode="range"
            captionLayout="dropdown"
            fromYear={2020}
            toYear={new Date().getFullYear() + 1}
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(nextRange) => {
              setPreset('custom');
              setDateRange(nextRange);
            }}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
