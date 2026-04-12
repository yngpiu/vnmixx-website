'use client';

import type { ColumnFiltersState, OnChangeFn, PaginationState } from '@tanstack/react-table';
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

function parseColumnFilters(searchParams: URLSearchParams): ColumnFiltersState {
  const filters: ColumnFiltersState = [];
  const statuses = searchParams.getAll('status');
  if (statuses.length > 0) {
    filters.push({ id: 'isActive', value: statuses });
  }
  const cat = searchParams.get('category');
  if (cat) {
    const id = Number.parseInt(cat, 10);
    if (Number.isFinite(id) && id >= 1) {
      filters.push({ id: 'categoryId', value: [String(id)] });
    }
  }
  return filters;
}

function buildSearchParamsFromState(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  globalFilter: string,
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

  const statusFilter = columnFilters.find((f) => f.id === 'isActive');
  const statuses = Array.isArray(statusFilter?.value) ? (statusFilter!.value as string[]) : [];
  for (const s of statuses) {
    if (typeof s === 'string' && s) params.append('status', s);
  }

  const catFilter = columnFilters.find((f) => f.id === 'categoryId');
  const cats = Array.isArray(catFilter?.value) ? (catFilter!.value as string[]) : [];
  const catOnly = cats.length === 1 ? cats[0] : undefined;
  if (typeof catOnly === 'string' && catOnly) {
    params.set('category', catOnly);
  }

  return params;
}

export function useProductsListUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const columnFilters = useMemo(() => parseColumnFilters(searchParams), [searchParams]);

  const globalFilter = useMemo(() => searchParams.get('q')?.trim() ?? '', [searchParams]);

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
      const params = buildSearchParamsFromState(next, columnFilters, globalFilter);
      replaceUrl(params);
    },
    [pagination, columnFilters, globalFilter, replaceUrl],
  );

  const onGlobalFilterChange = useCallback(
    (value: string) => {
      const params = buildSearchParamsFromState(
        { pageIndex: 0, pageSize: pagination.pageSize },
        columnFilters,
        value,
      );
      replaceUrl(params);
    },
    [pagination.pageSize, columnFilters, replaceUrl],
  );

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const params = buildSearchParamsFromState(
        { pageIndex: 0, pageSize: pagination.pageSize },
        next,
        globalFilter,
      );
      replaceUrl(params);
    },
    [pagination.pageSize, columnFilters, globalFilter, replaceUrl],
  );

  const ensurePageInRange = useCallback(
    (pageCount: number) => {
      if (pageCount <= 0) return;
      const current = pagination.pageIndex + 1;
      if (current > pageCount) {
        const params = buildSearchParamsFromState(
          { pageIndex: pageCount - 1, pageSize: pagination.pageSize },
          columnFilters,
          globalFilter,
        );
        replaceUrl(params);
      }
    },
    [pagination, columnFilters, globalFilter, replaceUrl],
  );

  return {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    globalFilter,
    onGlobalFilterChange,
    ensurePageInRange,
  };
}
