'use client';

import { OrdersTable } from '@/app/orders/orders-table';
import { PageViewHeader } from '@/components/page-view-header';

export function OrdersView() {
  return (
    <>
      <PageViewHeader
        title="Danh sách đơn hàng"
        description="Lọc theo trạng thái, thanh toán và tìm theo mã đơn, khách hàng hoặc vận đơn GHN."
      />
      <OrdersTable />
    </>
  );
}
