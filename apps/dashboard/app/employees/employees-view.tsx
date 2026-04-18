'use client';

import { EmployeesPrimaryButtons } from '@/app/employees/employees-primary-buttons';
import { EmployeesTable } from '@/app/employees/employees-table';
import { ListPage } from '@/components/list-page';
export function EmployeesView() {
  return (
    <ListPage title="Nhân viên" actions={<EmployeesPrimaryButtons />} headerClassName="gap-2">
      <EmployeesTable />
    </ListPage>
  );
}
