'use client';

import { EmployeeAuditLogsSection } from '@/app/employees/[employeeId]/employee-audit-logs-section';
import { BackButton } from '@/modules/common/components/back-button';
import { PageViewHeader } from '@/modules/common/components/page-view-header';
import { EmployeeDetailContent } from '@/modules/employees/components/employees/employee-detail-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { notFound, useParams } from 'next/navigation';

function parseEmployeeIdParam(raw: string | string[] | undefined): number | null {
  if (raw == null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    return null;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) {
    return null;
  }
  return n;
}

export function EmployeeDetailView() {
  const params = useParams();
  const employeeId = parseEmployeeIdParam(params.employeeId);
  if (employeeId === null) {
    notFound();
  }
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackButton className="w-fit gap-2 px-0 text-muted-foreground" />
        <PageViewHeader
          title={`Chi tiết nhân viên #${employeeId}`}
          description="Chuyển tab để xem hồ sơ tài khoản hoặc các thao tác quản trị do nhân viên này thực hiện."
        />
      </div>
      <Tabs defaultValue="info" className="flex flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="info" className="flex-none px-3">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-none px-3">
            Nhật ký thao tác
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-0 focus-visible:outline-none">
          <EmployeeDetailContent employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-0 flex flex-col gap-4 focus-visible:outline-none">
          <EmployeeAuditLogsSection employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
