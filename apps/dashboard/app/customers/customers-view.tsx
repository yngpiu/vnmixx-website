'use client';

import { CustomersTable } from '@/app/customers/customers-table';
import { PageViewHeader } from '@/components/page-view-header';

export function CustomersView() {
  return (
    <>
      <PageViewHeader
        title="Danh sách khách hàng"
        description="Quản lý tài khoản khách mua hàng trên cửa hàng."
      />
      <CustomersTable />
    </>
  );
}
