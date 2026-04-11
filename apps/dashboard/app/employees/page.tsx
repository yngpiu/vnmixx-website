import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nhân viên · Vnmixx' };

export default function EmployeesListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Nhân viên</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang danh sách nhân viên.</p>
    </div>
  );
}
