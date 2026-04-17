'use client';

import { PermissionCrudMatrix } from '@/components/roles/permission-crud-matrix';
import { getRole, listPermissions } from '@/lib/api/rbac';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog';
import { Separator } from '@repo/ui/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const noopAssign = () => {};
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type RoleDetailDialogProps = {
  roleId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RoleDetailDialog({ roleId, open, onOpenChange }: RoleDetailDialogProps) {
  const detailQuery = useQuery({
    queryKey: ['roles', 'detail', roleId],
    queryFn: () => getRole(roleId!),
    enabled: open && roleId != null,
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', 'list'],
    queryFn: listPermissions,
    enabled: open,
  });

  const r = detailQuery.data;
  const assignedIds = useMemo(
    () => (r ? new Set(r.permissions.map((p) => p.id)) : new Set<number>()),
    [r],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[min(92dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle className="text-base font-semibold">
              {`Chi tiết vai trò #${r?.id ?? roleId ?? '—'}`}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {detailQuery.isLoading && roleId != null ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">Đang tải…</p>
          ) : null}

          {detailQuery.isError ? (
            <p className="text-destructive px-6 py-6 text-center text-sm" role="alert">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Không tải được vai trò.'}
            </p>
          ) : null}

          {r ? (
            <>
              <div className="flex flex-col gap-5 px-5 py-3">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Tên
                    </p>
                    <p className="text-foreground text-sm font-medium">{r.name}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Mô tả
                    </p>
                    <p className="text-foreground text-sm">{r.description ?? '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Quyền ({r.permissions.length})
                  </p>
                  {permissionsQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">Đang tải danh sách quyền…</p>
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
                      {dateTimeFormatter.format(new Date(r.createdAt))}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Cập nhật:{' '}
                    <span className="text-foreground tabular-nums">
                      {dateTimeFormatter.format(new Date(r.updatedAt))}
                    </span>
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
