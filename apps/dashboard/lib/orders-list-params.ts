import type { ListAdminOrdersParams } from '@/lib/api/orders';
import type { OrderStatus, PaymentStatus } from '@/lib/types/order-admin';
import type { ColumnFiltersState, PaginationState } from '@tanstack/react-table';

function singleFacetedValue(
  columnFilters: ColumnFiltersState,
  columnId: string,
): string | undefined {
  const filter = columnFilters.find((f) => f.id === columnId);
  const values = Array.isArray(filter?.value) ? (filter.value as string[]) : [];
  if (values.length !== 1) {
    return undefined;
  }
  return values[0];
}

export function toListAdminOrdersParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
): ListAdminOrdersParams {
  const qFilter = columnFilters.find((f) => f.id === 'orderCode');
  const search = typeof qFilter?.value === 'string' ? qFilter.value.trim() || undefined : undefined;
  const statusRaw = singleFacetedValue(columnFilters, 'status');
  const paymentRaw = singleFacetedValue(columnFilters, 'paymentStatus');
  const status = statusRaw as OrderStatus | undefined;
  const paymentStatus = paymentRaw as PaymentStatus | undefined;
  return {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
  };
}
