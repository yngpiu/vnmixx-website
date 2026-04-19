'use client';

import { Button } from '@repo/ui/components/ui/button';
import type { Column, Table } from '@tanstack/react-table';
import { XIcon } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { DataTableFacetedFilter } from './faceted-filter';
import { DATA_TABLE_SEARCH_PLACEHOLDER, DataTableToolbarSearchInput } from './toolbar-search-input';
import { DataTableViewOptions } from './view-options';

type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  /** Mặc định {@link DATA_TABLE_SEARCH_PLACEHOLDER}. */
  searchPlaceholder?: string;
  /** Mô tả chi tiết kiểu tìm kiếm; khi có, ô tìm dùng input-group + icon info + tooltip. */
  searchHelpTooltip?: ReactNode;
  searchKey?: string;
  /** When set with `searchKey`, URL/API updates wait until typing pauses (smoother search). */
  searchDebounceMs?: number;
  /**
   * Khi không dùng `searchKey` (lọc global): trì hoãn cập nhật `globalFilter` theo ms (giảm tải khi gõ).
   * Mặc định 0 = cập nhật mỗi lần gõ.
   */
  globalFilterDebounceMs?: number;
  filters?: {
    columnId: string;
    title: string;
    selectionMode?: 'multi' | 'single';
    options: {
      label: string;
      value: string;
      icon?: ComponentType<{ className?: string }>;
    }[];
  }[];
  /** Bộ lọc tùy biến (vd. infinite select) — hiển thị cùng hàng với các faceted filter. */
  filterExtras?: ReactNode;
};

function DataTableToolbarDebouncedSearch<TData>({
  column,
  placeholder,
  debounceMs,
  searchHelpTooltip,
}: {
  column: Column<TData, unknown>;
  placeholder: string;
  debounceMs: number;
  searchHelpTooltip?: ReactNode;
}) {
  const committed = (column.getFilterValue() as string) ?? '';
  const [draft, setDraft] = useState(committed);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  useEffect(() => {
    if (draft === committed) {
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      column.setFilterValue(draft);
    }, debounceMs);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [column, committed, debounceMs, draft]);

  return (
    <DataTableToolbarSearchInput
      searchHelpTooltip={searchHelpTooltip}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function DataTableToolbarDebouncedGlobalSearch<TData>({
  table,
  placeholder,
  debounceMs,
  searchHelpTooltip,
}: {
  table: Table<TData>;
  placeholder: string;
  debounceMs: number;
  searchHelpTooltip?: ReactNode;
}) {
  const committed = table.getState().globalFilter ?? '';
  const [draft, setDraft] = useState(committed);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  useEffect(() => {
    if (draft === committed) {
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      table.setGlobalFilter(draft);
    }, debounceMs);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [table, committed, debounceMs, draft]);

  return (
    <DataTableToolbarSearchInput
      searchHelpTooltip={searchHelpTooltip}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = DATA_TABLE_SEARCH_PLACEHOLDER,
  searchHelpTooltip,
  searchKey,
  searchDebounceMs = 0,
  globalFilterDebounceMs = 0,
  filters = [],
  filterExtras,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || Boolean(table.getState().globalFilter);

  const searchColumn = searchKey ? table.getColumn(searchKey) : undefined;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:gap-2">
        {searchKey ? (
          searchColumn ? (
            searchDebounceMs > 0 ? (
              <DataTableToolbarDebouncedSearch
                column={searchColumn}
                placeholder={searchPlaceholder}
                debounceMs={searchDebounceMs}
                searchHelpTooltip={searchHelpTooltip}
              />
            ) : (
              <DataTableToolbarSearchInput
                searchHelpTooltip={searchHelpTooltip}
                placeholder={searchPlaceholder}
                value={(searchColumn.getFilterValue() as string) ?? ''}
                onChange={(event) => searchColumn.setFilterValue(event.target.value)}
              />
            )
          ) : null
        ) : globalFilterDebounceMs > 0 ? (
          <DataTableToolbarDebouncedGlobalSearch
            table={table}
            placeholder={searchPlaceholder}
            debounceMs={globalFilterDebounceMs}
            searchHelpTooltip={searchHelpTooltip}
          />
        ) : (
          <DataTableToolbarSearchInput
            searchHelpTooltip={searchHelpTooltip}
            placeholder={searchPlaceholder}
            value={table.getState().globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
          />
        )}
        <div className="flex flex-wrap gap-2">
          {filterExtras ?? null}
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) {
              return null;
            }
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
                selectionMode={filter.selectionMode}
              />
            );
          })}
        </div>
        {isFiltered ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter('');
            }}
            className="h-8 gap-1.5 px-2 lg:px-3"
          >
            <XIcon className="size-4" />
            Đặt lại
          </Button>
        ) : null}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
