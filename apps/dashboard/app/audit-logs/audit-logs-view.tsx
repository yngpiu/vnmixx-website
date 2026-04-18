'use client';

import { AuditLogsTable } from '@/app/audit-logs/audit-logs-table';
import { ListPage } from '@/components/list-page';

export function AuditLogsView() {
  return (
    <ListPage title="Audit log">
      <AuditLogsTable />
    </ListPage>
  );
}
