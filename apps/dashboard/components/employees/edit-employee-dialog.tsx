'use client';

import { MultiSelectPopover } from '@/components/multi-select-popover';
import { deleteEmployee, getEmployee, restoreEmployee, updateEmployee } from '@/lib/api/employees';
import { listRoles } from '@/lib/api/roles';
import type { UpdateEmployeePayload } from '@/lib/types/employee';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const editRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()),
});

type EditRolesFormValues = z.infer<typeof editRolesSchema>;

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

export type EmployeeDialogMode = 'roles' | 'active' | 'delete' | 'restore';

type EditEmployeeDialogProps = {
  employeeId: number | null;
  mode: EmployeeDialogMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditEmployeeDialog({
  employeeId,
  mode,
  open,
  onOpenChange,
}: EditEmployeeDialogProps) {
  const queryClient = useQueryClient();

  const rolesForm = useForm<EditRolesFormValues>({
    defaultValues: { roleIds: [] },
  });

  const {
    formState: { errors: rolesErrors },
    reset: resetRoles,
    control: rolesControl,
    handleSubmit: handleSubmitRoles,
    setError: setRolesError,
    clearErrors: clearRolesErrors,
  } = rolesForm;

  const detailQuery = useQuery({
    queryKey: ['employees', 'detail', employeeId],
    queryFn: () => getEmployee(employeeId!),
    enabled: open && employeeId != null,
  });

  const detail = detailQuery.data;

  useEffect(() => {
    if (!open) {
      resetRoles({ roleIds: [] });
      clearRolesErrors();
    }
  }, [open, resetRoles, clearRolesErrors]);

  useEffect(() => {
    if (!open || mode !== 'roles' || !detail || employeeId !== detail.id) return;
    resetRoles({
      roleIds: detail.employeeRoles.map((er) => er.role.id),
    });
  }, [detail, employeeId, mode, open, resetRoles]);

  const rolesQuery = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: listRoles,
    enabled: open && mode === 'roles',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmployeePayload }) =>
      updateEmployee(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['employees', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['employees', 'detail'] });
      if ('isActive' in variables.payload && variables.payload.isActive !== undefined) {
        toast.success(
          variables.payload.isActive ? 'Đã kích hoạt nhân viên.' : 'Đã vô hiệu hóa nhân viên.',
        );
      } else {
        toast.success('Đã cập nhật vai trò.');
      }
      onOpenChange(false);
    },
    onError: (err) => {
      if (mode === 'roles') {
        setRolesError('root', { message: apiErrorMessage(err) });
      } else {
        toast.error(apiErrorMessage(err));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['employees', 'detail'] });
      toast.success('Đã xóa nhân viên.');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreEmployee(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['employees', 'detail'] });
      toast.success('Đã khôi phục nhân viên.');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const isPending =
    updateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const isDeleted = Boolean(detail?.deletedAt);
  const rolesFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const activeFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const deleteFormDisabled = isPending || isDeleted || detailQuery.isLoading;
  const restoreFormDisabled = isPending || detailQuery.isLoading || !detail?.deletedAt;

  const submitRoles = (values: EditRolesFormValues) => {
    if (employeeId == null || mode !== 'roles') return;
    clearRolesErrors();
    const parsed = editRolesSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'roleIds') {
          rolesForm.setError(key, { message: issue.message });
        }
      }
      return;
    }
    updateMutation.mutate({ id: employeeId, payload: { roleIds: parsed.data.roleIds } });
  };

  const submitToggleActive = () => {
    if (employeeId == null || !detail || mode !== 'active') return;
    updateMutation.mutate({ id: employeeId, payload: { isActive: !detail.isActive } });
  };

  const submitDelete = () => {
    if (employeeId == null || mode !== 'delete') return;
    deleteMutation.mutate(employeeId);
  };

  const submitRestore = () => {
    if (employeeId == null || mode !== 'restore' || !detail?.deletedAt) return;
    restoreMutation.mutate(employeeId);
  };

  const title =
    mode === 'roles'
      ? 'Sửa vai trò'
      : mode === 'active'
        ? detail?.isActive
          ? 'Vô hiệu hóa nhân viên'
          : 'Kích hoạt nhân viên'
        : mode === 'delete'
          ? 'Xóa nhân viên'
          : mode === 'restore'
            ? 'Khôi phục nhân viên'
            : '';

  const description =
    mode === 'roles'
      ? 'Thay thế toàn bộ vai trò đang gán cho nhân viên này.'
      : mode === 'active' && detail
        ? detail.isActive
          ? 'Nhân viên sẽ không thể đăng nhập cho đến khi được kích hoạt lại.'
          : 'Khôi phục quyền đăng nhập cho nhân viên này.'
        : mode === 'delete' && detail && !detail.deletedAt
          ? 'Nhân viên sẽ không còn trong danh sách thông thường. Bạn có thể khôi phục sau qua menu hành động (khi bật lọc bản ghi đã xóa).'
          : mode === 'restore' && detail?.deletedAt
            ? 'Nhân viên sẽ hiển thị lại trong danh sách và có thể chỉnh sửa như bình thường.'
            : mode === 'restore' && detail && !detail.deletedAt
              ? 'Bản ghi hiện không ở trạng thái đã xóa.'
              : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {detailQuery.isLoading && employeeId != null ? (
          <p className="text-sm text-muted-foreground">Đang tải thông tin…</p>
        ) : null}

        {detailQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Không tải được nhân viên.'}
          </p>
        ) : null}

        {isDeleted && detail && mode !== 'restore' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              Nhân viên đã bị xóa — không thể thực hiện thao tác này. Dùng mục Khôi phục trên menu
              hành động.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && !isDeleted && mode === 'roles' ? (
          <form onSubmit={handleSubmitRoles(submitRoles)} noValidate>
            <FieldGroup className="gap-4">
              {rolesErrors.root ? (
                <Field data-invalid>
                  <FieldError errors={[rolesErrors.root]} />
                </Field>
              ) : null}

              <Card size="sm">
                <CardHeader>
                  <CardTitle>{detail.fullName}</CardTitle>
                  <CardDescription>{detail.email}</CardDescription>
                </CardHeader>
              </Card>

              <Field>
                <FieldLabel>Vai trò</FieldLabel>
                {rolesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải danh sách vai trò…</p>
                ) : null}
                {rolesQuery.isError ? (
                  <FieldError
                    errors={[
                      {
                        message:
                          'Không tải được vai trò (cần quyền xem RBAC). Thử lại sau hoặc liên hệ quản trị.',
                      },
                    ]}
                  />
                ) : null}
                <Controller
                  name="roleIds"
                  control={rolesControl}
                  render={({ field }) => {
                    const roles = rolesQuery.data ?? [];
                    const options = roles.map((r) => ({ value: r.id, label: r.name }));
                    return (
                      <MultiSelectPopover
                        options={options}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={rolesFormDisabled || options.length === 0}
                        placeholder="Chọn vai trò…"
                        aria-invalid={Boolean(rolesErrors.roleIds)}
                      />
                    );
                  }}
                />
                <FieldError errors={[rolesErrors.roleIds]} />
              </Field>
            </FieldGroup>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={rolesFormDisabled}>
                {isPending ? 'Đang lưu…' : 'Lưu vai trò'}
              </Button>
            </div>
          </form>
        ) : null}

        {detail && !detailQuery.isLoading && !isDeleted && mode === 'active' ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant={detail.isActive ? 'destructive' : 'default'}
                disabled={activeFormDisabled}
                onClick={submitToggleActive}
              >
                {isPending ? 'Đang xử lý…' : detail.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && !isDeleted && mode === 'delete' ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteFormDisabled}
                onClick={submitDelete}
              >
                {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && mode === 'restore' && isDeleted ? (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{detail.fullName}</CardTitle>
                <CardDescription>{detail.email}</CardDescription>
              </CardHeader>
            </Card>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="button" disabled={restoreFormDisabled} onClick={submitRestore}>
                {restoreMutation.isPending ? 'Đang khôi phục…' : 'Khôi phục'}
              </Button>
            </div>
          </div>
        ) : null}

        {detail && !detailQuery.isLoading && mode === 'restore' && !isDeleted ? (
          <p className="text-sm text-muted-foreground" role="status">
            Nhân viên này chưa bị xóa.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
