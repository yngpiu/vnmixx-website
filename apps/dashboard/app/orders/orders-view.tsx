'use client';

import { OrdersTable } from '@/app/orders/orders-table';
import { ListPage } from '@/components/list-page';

export function OrdersView() {
  return (
    <ListPage title="Đơn hàng">
      <OrdersTable />
    </ListPage>
  );
}
