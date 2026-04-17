'use client';

import { PermissionCrudMatrix } from '@/components/roles/permission-crud-matrix';
import { RoleFormTabs } from '@/components/roles/role-form-tabs';
import { getRole, listPermissions, updateRole } from '@/lib/api/rbac';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: unknown };
    const m = body?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi.';
}

type RoleEditTab = 'meta' | 'perms';

type RoleEditDialogProps = {
  roleId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RoleEditDialog({ roleId, open, onOpenChange }: RoleEditDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RoleEditTab>('meta');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedIds, setAssignedIds] = useState<Set<number>>(() => new Set());

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

  const detail = detailQuery.data;
  const allPermissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);

  useEffect(() => {
    if (!open) return;
    setTab('meta');
  }, [open, roleId]);

  useEffect(() => {
    if (!open || !detail) return;
    setName(detail.name);
    setDescription(detail.description ?? '');
    setAssignedIds(new Set(detail.permissions.map((p) => p.id)));
  }, [open, detail]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (roleId == null) throw new Error('Thiếu vai trò');
      return updateRole(roleId, {
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: [...assignedIds],
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(
        tab === 'meta' ? 'Đã cập nhật thông tin vai trò.' : 'Đã cập nhật quyền cho vai trò.',
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = saveMutation.isPending;
  const canSaveMeta = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle>Sửa vai trò</DialogTitle>
            <DialogDescription>
              Đổi tên, mô tả và gán quyền qua ma trận CRUD ở tab Quyền.
            </DialogDescription>
          </DialogHeader>
        </div>

        {detailQuery.isLoading && roleId != null ? (
          <p className="text-muted-foreground px-6 py-8 text-center text-sm">Đang tải…</p>
        ) : null}

        {detailQuery.isError ? (
          <p className="text-destructive px-6 py-6 text-sm" role="alert">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Không tải được vai trò.'}
          </p>
        ) : null}

        {detail && !detailQuery.isError ? (
          <>
            <RoleFormTabs
              tab={tab}
              onTabChange={(value) => setTab(value as RoleEditTab)}
              metaContent={
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role-edit-name">Tên vai trò</Label>
                    <Input
                      id="role-edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-edit-desc">Mô tả</Label>
                    <Textarea
                      id="role-edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={busy}
                      rows={3}
                      maxLength={255}
                    />
                  </div>
                </>
              }
              permissionsContent={
                <>
                  {permissionsQuery.isLoading ? (
                    <p className="text-muted-foreground text-sm">Đang tải danh sách quyền…</p>
                  ) : permissionsQuery.isError ? (
                    <p className="text-destructive text-sm" role="alert">
                      Không tải được danh sách quyền.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Ma trận theo tài nguyên (Tạo · Xem · Sửa · Xóa). Tick từng ô hoặc dùng
                        checkbox ở đầu cột / hàng để gán hàng loạt.
                      </p>
                      <PermissionCrudMatrix
                        permissions={allPermissions}
                        assignedIds={assignedIds}
                        disabled={busy}
                        onAssignedChange={(id, assigned) => {
                          setAssignedIds((prev) => {
                            const next = new Set(prev);
                            if (assigned) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                        }}
                      />
                    </>
                  )}
                </>
              }
            />

            <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Đóng
              </Button>
              {tab === 'meta' ? (
                <Button
                  type="button"
                  disabled={busy || !canSaveMeta}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? 'Đang lưu…' : 'Lưu quyền'}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
