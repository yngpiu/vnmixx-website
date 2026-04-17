'use client';

import { EmployeesPrimaryButtons } from '@/app/employees/employees-primary-buttons';
import { EmployeesTable } from '@/app/employees/employees-table';
export function EmployeesView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh sách nhân viên</h2>
          <p className="text-muted-foreground">
            Quản lý nhân viên đăng nhập quản trị và phân quyền.
          </p>
        </div>
        <EmployeesPrimaryButtons />
      </div>
      <EmployeesTable />
    </>
  );
}
