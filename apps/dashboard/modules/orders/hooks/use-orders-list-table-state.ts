'use client';

import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = new Set([10, 20, 30, 40, 50]);

function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || !ALLOWED_PAGE_SIZES.has(pageSize)) {
    return DEFAULT_PAGE_SIZE;
  }
  return pageSize;
}

export function useOrdersListTableState() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback((updater) => {
    setPagination((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return {
        pageIndex: Math.max(0, next.pageIndex),
        pageSize: clampPageSize(next.pageSize),
      };
    });
  }, []);

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback((updater) => {
    setColumnFilters((previous) => (typeof updater === 'function' ? updater(previous) : updater));
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, []);

  const ensurePageInRange = useCallback(
    (pageCount: number) => {
      if (pageCount <= 0) {
        return;
      }
      const currentPage = pagination.pageIndex + 1;
      if (currentPage > pageCount) {
        setPagination((previous) => ({ ...previous, pageIndex: pageCount - 1 }));
      }
    },
    [pagination.pageIndex],
  );

  return {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    ensurePageInRange,
  };
}
