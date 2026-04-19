'use client';

import { getRole, listPermissions } from '@/modules/rbac/api/rbac';
import { PermissionCrudMatrix } from '@/modules/rbac/components/roles/permission-crud-matrix';
import { Separator } from '@repo/ui/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const noopAssign = () => {};

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type RoleDetailContentProps = {
  roleId: number;
};

export function RoleDetailContent({ roleId }: RoleDetailContentProps) {
  const detailQuery = useQuery({
    queryKey: ['roles', 'detail', roleId],
    queryFn: () => getRole(roleId),
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', 'list'],
    queryFn: listPermissions,
  });

  const role = detailQuery.data;
  const assignedIds = useMemo(
    () => new Set(role?.permissions.map((permission) => permission.id) ?? []),
    [role],
  );

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">Đang tải thông tin vai trò...</p>
      </div>
    );
  }

  if (detailQuery.isError || !role) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-destructive text-sm" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Không tải được thông tin vai trò.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <div className="flex flex-col gap-5 px-5 py-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Tên</p>
            <p className="text-foreground text-sm font-medium">{role.name}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Mô tả
            </p>
            <p className="text-foreground text-sm">{role.description ?? '-'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Quyền ({role.permissions.length})
          </p>
          {permissionsQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Đang tải danh sách quyền...</p>
          ) : permissionsQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              Không tải được ma trận quyền.
            </p>
          ) : (
            <PermissionCrudMatrix
              permissions={permissionsQuery.data ?? []}
              assignedIds={assignedIds}
              onAssignedChange={noopAssign}
              disabled
            />
          )}
        </div>
        <Separator />
        <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          <p className="text-muted-foreground">
            Tạo lúc:{' '}
            <span className="text-foreground tabular-nums">
              {dateTimeFormatter.format(new Date(role.createdAt))}
            </span>
          </p>
          <p className="text-muted-foreground">
            Cập nhật:{' '}
            <span className="text-foreground tabular-nums">
              {dateTimeFormatter.format(new Date(role.updatedAt))}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
