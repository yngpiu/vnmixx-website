'use client';

import { useResetPassword } from '@/modules/auth/hooks/use-auth';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
      .max(72, { message: 'Mật khẩu mới không được vượt quá 72 ký tự.' }),
    confirmPassword: z.string().min(1, { message: 'Vui lòng nhập lại mật khẩu mới.' }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp.',
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetPasswordMutation = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const email = useMemo(
    () => (searchParams.get('email') ?? '').trim().toLowerCase(),
    [searchParams],
  );
  const resetToken = useMemo(() => (searchParams.get('resetToken') ?? '').trim(), [searchParams]);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;
  const newPasswordRegistration = register('newPassword');
  const confirmPasswordRegistration = register('confirmPassword');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const newPasswordFieldProps = omitRegisterName(newPasswordRegistration);
  const confirmPasswordFieldProps = omitRegisterName(confirmPasswordRegistration);
  const busy = resetPasswordMutation.isPending;
  const hasRecoveryContext = Boolean(email) && Boolean(resetToken);

  const onSubmit = async (values: ResetPasswordValues): Promise<void> => {
    setFormError(null);
    if (!hasRecoveryContext) {
      setFormError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        email,
        resetToken,
        newPassword: values.newPassword,
      });
      router.push('/login?reset=1');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <main className="shop-shell-container pb-10 pt-12">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-[460px] space-y-5"
        noValidate
      >
        <div className="space-y-2 text-center">
          <h1 className="mb-0 text-[20px] font-semibold leading-[30px] text-foreground uppercase">
            Đặt lại mật khẩu
          </h1>
          <p className="text-[14px] leading-[24px] text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>
        {!hasRecoveryContext ? (
          <p
            className={cn(
              'text-destructive bg-destructive/5 rounded-lg border border-destructive/20 px-3 py-2 text-sm',
            )}
            role="alert"
          >
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
        ) : null}
        <Field data-invalid={Boolean(errors.newPassword)} className="gap-0">
          <LabeledInput
            type="password"
            label="Mật khẩu mới"
            name="newPassword"
            disabled={busy || !hasRecoveryContext}
            autoComplete="new-password"
            {...newPasswordFieldProps}
          />
          {errors.newPassword ? (
            <FieldError errors={[{ message: errors.newPassword.message }]} />
          ) : null}
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)} className="gap-0">
          <LabeledInput
            type="password"
            label="Nhập lại mật khẩu mới"
            name="confirmPassword"
            disabled={busy || !hasRecoveryContext}
            autoComplete="new-password"
            {...confirmPasswordFieldProps}
          />
          {errors.confirmPassword ? (
            <FieldError errors={[{ message: errors.confirmPassword.message }]} />
          ) : null}
        </Field>
        {formError ? (
          <p
            className={cn(
              'text-destructive bg-destructive/5 rounded-lg border border-destructive/20 px-3 py-2 text-sm',
            )}
            role="alert"
          >
            {formError}
          </p>
        ) : null}
        <PrimaryCtaButton
          type="submit"
          disabled={busy || !hasRecoveryContext}
          aria-disabled={busy || !hasRecoveryContext}
        >
          {busy ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT MẬT KHẨU'}
        </PrimaryCtaButton>
        <div className="text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </main>
  );
}
