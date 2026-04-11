'use client';

import { PermissionCrudMatrix } from '@/components/roles/permission-crud-matrix';
import { createRole, listPermissions } from '@/lib/api/rbac';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CREATE_ROLE_FORM_ID = 'create-role-dialog-form';

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

type CreateRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedIds, setAssignedIds] = useState<Set<number>>(() => new Set());
  const [nameError, setNameError] = useState<string | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ['permissions', 'list'],
    queryFn: listPermissions,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setAssignedIds(new Set());
    setNameError(null);
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      createRole({
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: assignedIds.size ? [...assignedIds] : undefined,
      }),
    onSuccess: async () => {
      toast.success('Đã tạo vai trò.');
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const submit = () => {
    setNameError(null);
    if (!name.trim()) {
      setNameError('Tên vai trò là bắt buộc.');
      return;
    }
    createMutation.mutate();
  };

  const busy = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle>Thêm vai trò</DialogTitle>
            <DialogDescription>
              Đặt tên và mô tả, sau đó tick quyền theo ma trận CRUD (Tạo / Xem / Sửa / Xóa) theo tài
              nguyên.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          id={CREATE_ROLE_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="create-role-name">Tên vai trò</FieldLabel>
              <Input
                id="create-role-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                disabled={busy}
                maxLength={50}
                placeholder="VD: Kế toán"
              />
              <FieldError errors={nameError ? [{ message: nameError }] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="create-role-desc">Mô tả</FieldLabel>
              <Textarea
                id="create-role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                maxLength={255}
                rows={3}
                placeholder="Mô tả ngắn cho vai trò này"
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Quyền</p>
            {permissionsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Đang tải danh sách quyền…</p>
            ) : permissionsQuery.isError ? (
              <p className="text-destructive text-sm" role="alert">
                Không tải được danh sách quyền.
              </p>
            ) : (
              <PermissionCrudMatrix
                permissions={permissionsQuery.data ?? []}
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
            )}
          </div>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form={CREATE_ROLE_FORM_ID} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo vai trò'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
