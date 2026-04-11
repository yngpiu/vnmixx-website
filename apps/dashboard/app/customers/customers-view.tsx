'use client';

import { CustomersTable } from '@/app/customers/customers-table';

export function CustomersView() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Danh sách khách hàng</h2>
        <p className="text-muted-foreground">Quản lý tài khoản khách mua hàng trên cửa hàng.</p>
      </div>
      <CustomersTable />
    </>
  );
}
