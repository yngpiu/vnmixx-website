'use client';

import { EmployeesPrimaryButtons } from '@/app/employees/employees-primary-buttons';
import { EmployeesTable } from '@/app/employees/employees-table';
import { PageViewHeader } from '@/components/page-view-header';
export function EmployeesView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <PageViewHeader
          title="Danh sách nhân viên"
          description="Quản lý nhân viên đăng nhập quản trị và phân quyền."
        />
        <EmployeesPrimaryButtons />
      </div>
      <EmployeesTable />
    </>
  );
}
