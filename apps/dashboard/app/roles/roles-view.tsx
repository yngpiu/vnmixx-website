'use client';

import { RolesPrimaryButtons } from '@/app/roles/roles-primary-buttons';
import { RolesTable } from '@/app/roles/roles-table';
import { ListPage } from '@/components/list-page';

export function RolesView() {
  return (
    <ListPage title="Vai trò" actions={<RolesPrimaryButtons />} headerClassName="gap-2">
      <RolesTable />
    </ListPage>
  );
}
