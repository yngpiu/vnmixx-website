'use client';

import { RolesPrimaryButtons } from '@/app/roles/roles-primary-buttons';
import { RolesTable } from '@/app/roles/roles-table';

export function RolesView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vai trò</h2>
          <p className="text-muted-foreground">
            Nhóm quyền cho nhân viên. Gán quyền chi tiết trong màn sửa hoặc khi tạo mới.
          </p>
        </div>
        <RolesPrimaryButtons />
      </div>
      <RolesTable />
    </>
  );
}
