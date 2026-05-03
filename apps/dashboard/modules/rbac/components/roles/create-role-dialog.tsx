'use client';

import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { createRole, listPermissions } from '@/modules/rbac/api/rbac';
import { PermissionCrudMatrix } from '@/modules/rbac/components/roles/permission-crud-matrix';
import { RoleFormTabs } from '@/modules/rbac/components/roles/role-form-tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const CREATE_ROLE_FORM_ID = 'create-role-dialog-form';
const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên vai trò là bắt buộc.')
    .max(50, 'Tên vai trò không vượt quá 50 ký tự.'),
  description: z
    .string()
    .min(1, 'Mô tả là bắt buộc.')
    .max(255, 'Mô tả không vượt quá 255 ký tự.')
    .optional(),
});
type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

type CreateRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'meta' | 'perms'>('meta');
  const [assignedIds, setAssignedIds] = useState<Set<number>>(() => new Set());
  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', 'list'],
    queryFn: listPermissions,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setTab('meta');
    form.reset({
      name: '',
      description: '',
    });
    setAssignedIds(new Set());
  }, [form, open]);

  const createMutation = useMutation({
    mutationFn: (values: CreateRoleFormValues) =>
      createRole({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        permissionIds: assignedIds.size ? [...assignedIds] : undefined,
      }),
    onSuccess: async () => {
      toast.success('Đã tạo vai trò.');
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const submit = form.handleSubmit((values: CreateRoleFormValues) => {
    createMutation.mutate(values);
  });

  const busy = createMutation.isPending;
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
        aria-describedby={undefined}
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle>Thêm vai trò</DialogTitle>
          </DialogHeader>
        </div>

        <form
          id={CREATE_ROLE_FORM_ID}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e);
          }}
          noValidate
        >
          <RoleFormTabs
            tab={tab}
            onTabChange={setTab}
            metaContent={
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="create-role-name">Tên vai trò</FieldLabel>
                  <Input
                    id="create-role-name"
                    {...register('name')}
                    aria-invalid={Boolean(errors.name)}
                    disabled={busy}
                    maxLength={50}
                    placeholder="VD: Kế toán"
                  />
                  {errors.name ? <FieldError className="mt-1" errors={[errors.name]} /> : null}
                </Field>
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="create-role-desc">Mô tả</FieldLabel>
                  <Textarea
                    id="create-role-desc"
                    {...register('description')}
                    aria-invalid={Boolean(errors.description)}
                    disabled={busy}
                    maxLength={255}
                    rows={3}
                    placeholder="Mô tả ngắn cho vai trò này"
                  />
                  {errors.description ? (
                    <FieldError className="mt-1" errors={[errors.description]} />
                  ) : null}
                </Field>
              </FieldGroup>
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
              </>
            }
          />
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
