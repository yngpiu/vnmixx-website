'use client';

import { OrdersTable } from '@/app/orders/orders-table';
import { ListPage } from '@/modules/common/components/list-page';
import { Button } from '@repo/ui/components/ui/button';
import { HistoryIcon } from 'lucide-react';
import Link from 'next/link';

export function OrdersView() {
  return (
    <ListPage
      title="Đơn hàng"
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href="/orders/sepay-transactions">
            <HistoryIcon className="size-4" />
            Lịch sử giao dịch
          </Link>
        </Button>
      }
    >
      <OrdersTable />
    </ListPage>
  );
}
