'use client';

import { COLOR_TABLE_SORT_IDS } from '@/lib/data-table-sort-allowlists';
import { appendSortingToSearchParams, sortingStateFromUrl } from '@/lib/data-table-sort-url';
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = new Set([10, 20, 30, 40, 50]);

function clampPageSize(n: number): number {
  if (!Number.isFinite(n) || !ALLOWED_PAGE_SIZES.has(n)) {
    return DEFAULT_PAGE_SIZE;
  }
  return n;
}

function buildSearchParamsFromState(
  pagination: PaginationState,
  globalFilter: string,
  sorting: SortingState,
): URLSearchParams {
  const params = new URLSearchParams();
  const page = pagination.pageIndex + 1;
  const { pageSize } = pagination;
  if (page !== DEFAULT_PAGE) {
    params.set('page', String(page));
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(pageSize));
  }
  const q = globalFilter.trim();
  if (q) {
    params.set('q', q);
  }
  appendSortingToSearchParams(params, sorting, COLOR_TABLE_SORT_IDS);
  return params;
}

export function useColorsListUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const globalFilter = useMemo(() => searchParams.get('q')?.trim() ?? '', [searchParams]);

  const sorting = useMemo(
    () => sortingStateFromUrl(searchParams, COLOR_TABLE_SORT_IDS),
    [searchParams],
  );

  const pagination: PaginationState = useMemo(() => {
    const rawPage = Number.parseInt(searchParams.get('page') ?? `${DEFAULT_PAGE}`, 10);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE;
    const rawSize = Number.parseInt(searchParams.get('pageSize') ?? `${DEFAULT_PAGE_SIZE}`, 10);
    const pageSize = clampPageSize(rawSize);
    return { pageIndex: page - 1, pageSize };
  }, [searchParams]);

  const replaceUrl = useCallback(
    (nextParams: URLSearchParams) => {
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      const params = buildSearchParamsFromState(next, globalFilter, sorting);
      replaceUrl(params);
    },
    [pagination, globalFilter, sorting, replaceUrl],
  );

  const onGlobalFilterChange = useCallback(
    (value: string) => {
      const params = buildSearchParamsFromState(
        { pageIndex: 0, pageSize: pagination.pageSize },
        value,
        sorting,
      );
      replaceUrl(params);
    },
    [pagination.pageSize, sorting, replaceUrl],
  );

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const params = buildSearchParamsFromState(
        { pageIndex: 0, pageSize: pagination.pageSize },
        globalFilter,
        next,
      );
      replaceUrl(params);
    },
    [pagination.pageSize, globalFilter, sorting, replaceUrl],
  );

  const ensurePageInRange = useCallback(
    (pageCount: number) => {
      if (pageCount <= 0) return;
      const current = pagination.pageIndex + 1;
      if (current > pageCount) {
        const params = buildSearchParamsFromState(
          { pageIndex: pageCount - 1, pageSize: pagination.pageSize },
          globalFilter,
          sorting,
        );
        replaceUrl(params);
      }
    },
    [pagination, globalFilter, sorting, replaceUrl],
  );

  return {
    pagination,
    onPaginationChange,
    globalFilter,
    onGlobalFilterChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  };
}
