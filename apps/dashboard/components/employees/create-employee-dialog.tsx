'use client';

import { MultiSelectPopover } from '@/components/multi-select-popover';
import { createEmployee } from '@/lib/api/employees';
import { listRoles } from '@/lib/api/roles';
import type { CreateEmployeePayload } from '@/lib/types/employee';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { message: 'Họ tên không được để trống.' })
    .max(100, { message: 'Họ tên tối đa 100 ký tự.' }),
  email: z.email({ error: 'Địa chỉ email không hợp lệ.' }),
  phoneNumber: z
    .string()
    .trim()
    .min(1, { message: 'Số điện thoại không được để trống.' })
    .max(20, { message: 'Số điện thoại tối đa 20 ký tự.' }),
  password: z.string().min(8, { message: 'Mật khẩu tối thiểu 8 ký tự.' }),
  roleIds: z.array(z.number().int().positive()),
});

type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;

const defaultFormValues: CreateEmployeeFormValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  roleIds: [],
};

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

type CreateEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateEmployeeDialog({ open, onOpenChange }: CreateEmployeeDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateEmployeeFormValues>({
    defaultValues: defaultFormValues,
  });

  const {
    formState: { errors },
    reset,
    control,
    register,
    handleSubmit,
    setError,
  } = form;

  useEffect(() => {
    if (!open) {
      reset(defaultFormValues);
    }
  }, [open, reset]);

  const rolesQuery = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: listRoles,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEmployeePayload) => createEmployee(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees', 'list'] });
      toast.success('Đã tạo nhân viên.');
      onOpenChange(false);
    },
    onError: (err) => {
      setError('root', { message: apiErrorMessage(err) });
    },
  });

  const isPending = createMutation.isPending;

  const submitCreate = (values: CreateEmployeeFormValues) => {
    form.clearErrors();
    const parsed = createEmployeeSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === 'fullName' ||
          key === 'email' ||
          key === 'phoneNumber' ||
          key === 'password' ||
          key === 'roleIds'
        ) {
          form.setError(key, { message: issue.message });
        }
      }
      return;
    }
    const v = parsed.data;
    const payload: CreateEmployeePayload = {
      fullName: v.fullName,
      email: v.email,
      phoneNumber: v.phoneNumber,
      password: v.password,
      ...(v.roleIds.length > 0 ? { roleIds: v.roleIds } : {}),
    };
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Tạo tài khoản đăng nhập quản trị. Có thể gán một hoặc nhiều vai trò.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submitCreate)} noValidate>
          <FieldGroup className="gap-4">
            {errors.root ? (
              <Field data-invalid>
                <FieldError errors={[errors.root]} />
              </Field>
            ) : null}
            <Field data-invalid={Boolean(errors.fullName)}>
              <FieldLabel htmlFor="emp-fullName">Họ và tên</FieldLabel>
              <Input
                id="emp-fullName"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                disabled={isPending}
                {...register('fullName')}
              />
              <FieldError errors={[errors.fullName]} />
            </Field>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="emp-email">Email</FieldLabel>
              <Input
                id="emp-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                disabled={isPending}
                {...register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={Boolean(errors.phoneNumber)}>
              <FieldLabel htmlFor="emp-phone">Số điện thoại</FieldLabel>
              <Input
                id="emp-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phoneNumber)}
                disabled={isPending}
                {...register('phoneNumber')}
              />
              <FieldError errors={[errors.phoneNumber]} />
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="emp-password">Mật khẩu</FieldLabel>
              <Input
                id="emp-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                disabled={isPending}
                {...register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
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
                        'Không tải được vai trò (cần quyền xem RBAC). Bạn vẫn có thể tạo nhân viên không gán vai trò.',
                    },
                  ]}
                />
              ) : null}
              <Controller
                name="roleIds"
                control={control}
                render={({ field }) => {
                  const roles = rolesQuery.data ?? [];
                  const options = roles.map((r) => ({ value: r.id, label: r.name }));
                  return (
                    <MultiSelectPopover
                      options={options}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending || options.length === 0}
                      placeholder="Chọn vai trò…"
                      aria-invalid={Boolean(errors.roleIds)}
                    />
                  );
                }}
              />
              <FieldDescription>Có thể chọn nhiều vai trò nếu cần thiết.</FieldDescription>
              <FieldError errors={[errors.roleIds]} />
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang tạo…' : 'Tạo nhân viên'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
