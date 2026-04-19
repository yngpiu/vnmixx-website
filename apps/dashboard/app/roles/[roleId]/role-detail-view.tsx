'use client';

import { RoleEmployeesSection } from '@/app/roles/[roleId]/role-employees-section';
import { BackButton } from '@/modules/common/components/back-button';
import { PageViewHeader } from '@/modules/common/components/page-view-header';
import { RoleDetailContent } from '@/modules/rbac/components/roles/role-detail-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { notFound, useParams } from 'next/navigation';

function parseRoleIdParam(raw: string | string[] | undefined): number | null {
  if (raw == null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    return null;
  }
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return null;
  }
  return numberValue;
}

export function RoleDetailView() {
  const params = useParams();
  const roleId = parseRoleIdParam(params.roleId);

  if (roleId === null) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackButton className="w-fit gap-2 px-0 text-muted-foreground" />
        <PageViewHeader
          title={`Chi tiết vai trò #${roleId}`}
          description="Xem thông tin vai trò và danh sách nhân viên đang được gán vào vai trò này."
        />
      </div>

      <Tabs defaultValue="info" className="flex flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="info" className="flex-none px-3">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex-none px-3">
            Nhân viên
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-0 focus-visible:outline-none">
          <RoleDetailContent roleId={roleId} />
        </TabsContent>
        <TabsContent value="employees" className="mt-0 focus-visible:outline-none">
          <RoleEmployeesSection roleId={roleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
