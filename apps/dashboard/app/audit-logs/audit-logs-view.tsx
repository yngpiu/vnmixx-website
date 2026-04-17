'use client';

import { AuditLogsTable } from '@/app/audit-logs/audit-logs-table';
import { PageViewHeader } from '@/components/page-view-header';

export function AuditLogsView() {
  return (
    <>
      <PageViewHeader
        title="Audit log"
        description="Theo dõi lịch sử thao tác quản trị. Dùng nút mắt ở cột Chi tiết để xem beforeData / afterData (tra cứu, không tự khôi phục)."
      />
      <AuditLogsTable />
    </>
  );
}
