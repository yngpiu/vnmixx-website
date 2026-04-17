'use client';

import { SearchableMultiSelect } from '@/components/searchable-multi-select';
import { createEmployee } from '@/lib/api/employees';
import { listRoles } from '@/lib/api/roles';
import type { CreateEmployeePayload } from '@/lib/types/employee';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const CREATE_EMPLOYEE_FORM_ID = 'create-employee-dialog-form';

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
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
            <DialogDescription>
              Tạo tài khoản đăng nhập quản trị. Có thể gán một hoặc nhiều vai trò.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          id={CREATE_EMPLOYEE_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={handleSubmit(submitCreate)}
          noValidate
        >
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
                  const options = roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }));
                  return (
                    <SearchableMultiSelect
                      options={options}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending || options.length === 0}
                      placeholder="Chọn vai trò…"
                      searchPlaceholder="Tìm vai trò..."
                      aria-invalid={Boolean(errors.roleIds)}
                    />
                  );
                }}
              />
              <FieldDescription>Có thể chọn nhiều vai trò nếu cần thiết.</FieldDescription>
              <FieldError errors={[errors.roleIds]} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form={CREATE_EMPLOYEE_FORM_ID} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo nhân viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
