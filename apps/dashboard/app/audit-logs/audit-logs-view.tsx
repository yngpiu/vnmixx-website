'use client';

import { AuditLogsTable } from '@/app/audit-logs/audit-logs-table';
import { ListPage } from '@/modules/common/components/list-page';

export function AuditLogsView() {
  return (
    <ListPage title="Nhật ký thao tác">
      <AuditLogsTable />
    </ListPage>
  );
}
