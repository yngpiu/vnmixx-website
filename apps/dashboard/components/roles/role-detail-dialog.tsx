'use client';

import { PermissionCrudMatrix } from '@/components/roles/permission-crud-matrix';
import { getRole, listPermissions } from '@/lib/api/rbac';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const noopAssign = () => {};

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
            <DialogTitle className="text-base font-semibold">Chi tiết vai trò</DialogTitle>
            <DialogDescription className="sr-only">
              Thông tin vai trò và ma trận quyền (chỉ xem).
            </DialogDescription>
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
              <div className="flex flex-col gap-4 px-6 py-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Tên
                  </p>
                  <p className="text-foreground mt-0.5 font-medium">{r.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Mô tả
                  </p>
                  <p className="text-foreground mt-0.5 text-sm">{r.description ?? '—'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-6 py-2">
                <p className="text-sm font-medium">Quyền ({r.permissions.length})</p>
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

              <div className="text-muted-foreground px-6 pb-6 text-xs">
                Cập nhật: {dateFormatter.format(new Date(r.updatedAt))}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
