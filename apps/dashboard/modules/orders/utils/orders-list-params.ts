import {
  getBaseListParams,
  getSearchQuery,
  getSingleFacetedValue,
} from '@/modules/common/utils/data-table-query';
import type { ListAdminOrdersParams } from '@/modules/orders/api/orders';
import type { OrderStatus, PaymentStatus } from '@/modules/orders/types/order-admin';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';

export function toListAdminOrdersParams(
  pagination: PaginationState,
  columnFilters: ColumnFiltersState,
  sorting: SortingState,
): ListAdminOrdersParams {
  return {
    ...getBaseListParams(pagination, sorting, []), // Đơn hàng hiện chưa dùng sort ids từ allowlist trong util này
    search: getSearchQuery(columnFilters, 'orderCode'),
    status: getSingleFacetedValue(columnFilters, 'status') as OrderStatus | undefined,
    paymentStatus: getSingleFacetedValue(columnFilters, 'paymentStatus') as
      | PaymentStatus
      | undefined,
  };
}
