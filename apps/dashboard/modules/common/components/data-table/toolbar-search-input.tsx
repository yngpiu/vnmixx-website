'use client';

import { Input } from '@repo/ui/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { InfoIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

/** Placeholder mặc định cho ô tìm trong thanh công cụ bảng; mô tả chi tiết đặt trong tooltip (icon info). */
export const DATA_TABLE_SEARCH_PLACEHOLDER = 'Tìm kiếm…';

export const DATA_TABLE_TOOLBAR_SEARCH_WIDTH_CLASS = 'h-8 w-[150px] lg:w-[260px]';

export type DataTableToolbarSearchInputProps = ComponentProps<typeof Input> & {
  /** Nội dung tooltip khi bấm/hover nút info (vd. mô tả trường được tìm). */
  searchHelpTooltip?: ReactNode;
  /** Phần tử hiển thị ở đầu input-group (vd. icon kính lúp). */
  startAddon?: ReactNode;
  /** Phần tử hiển thị ở cuối input-group, trước nút info (vd. nút xóa nội dung tìm). */
  endAddon?: ReactNode;
};

/**
 * Ô tìm kiếm dùng chung: `Input` đơn giản, hoặc `InputGroup` với addon tùy chọn + nút info + tooltip.
 */
export function DataTableToolbarSearchInput({
  searchHelpTooltip,
  startAddon,
  endAddon,
  className,
  ...props
}: DataTableToolbarSearchInputProps) {
  const useInputGroup = Boolean(searchHelpTooltip || startAddon || endAddon);

  if (!useInputGroup) {
    return <Input className={cn(DATA_TABLE_TOOLBAR_SEARCH_WIDTH_CLASS, className)} {...props} />;
  }

  return (
    <InputGroup className={cn(DATA_TABLE_TOOLBAR_SEARCH_WIDTH_CLASS, className)}>
      {startAddon ? (
        <InputGroupAddon
          align="inline-start"
          className="cursor-default gap-0 pl-2 text-muted-foreground"
        >
          {startAddon}
        </InputGroupAddon>
      ) : null}
      <InputGroupInput className="min-w-0" {...props} />
      {searchHelpTooltip || endAddon ? (
        <InputGroupAddon align="inline-end" className="gap-0.5 pr-1">
          {endAddon}
          {searchHelpTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Hướng dẫn tìm kiếm"
                >
                  <InfoIcon className="size-4" />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                {searchHelpTooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
