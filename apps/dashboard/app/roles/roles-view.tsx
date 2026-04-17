'use client';

import { RolesPrimaryButtons } from '@/app/roles/roles-primary-buttons';
import { RolesTable } from '@/app/roles/roles-table';
import { PageViewHeader } from '@/components/page-view-header';

export function RolesView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <PageViewHeader
          title="Vai trò"
          description="Quản lý thông tin vai trò và quyền truy cập cho nhân viên."
        />
        <RolesPrimaryButtons />
      </div>
      <RolesTable />
    </>
  );
}
