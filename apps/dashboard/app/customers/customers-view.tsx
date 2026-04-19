'use client';

import { CustomersTable } from '@/app/customers/customers-table';
import { ListPage } from '@/modules/common/components/list-page';

export function CustomersView() {
  return (
    <ListPage title="Khách hàng">
      <CustomersTable />
    </ListPage>
  );
}
