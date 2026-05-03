'use client';

import { useForgotPassword } from '@/modules/auth/hooks/use-auth';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.email({ message: 'Email không hợp lệ.' }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const forgotPasswordMutation = useForgotPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;
  const emailRegistration = register('email');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const emailFieldProps = omitRegisterName(emailRegistration);
  const busy = forgotPasswordMutation.isPending;

  const onSubmit = async (values: ForgotPasswordValues): Promise<void> => {
    setFormError(null);
    try {
      const backendResponse = await forgotPasswordMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
      });
      const query = new URLSearchParams({
        email: backendResponse.email,
        resendAfter: String(backendResponse.resendAfter),
      });
      router.push(`/forgot-password/otp?${query.toString()}`);
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
            Quên mật khẩu
          </h1>
          <p className="text-[14px] leading-[24px] text-muted-foreground">
            Nhập email đã đăng ký để nhận OTP đặt lại mật khẩu.
          </p>
        </div>
        <LabeledInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Nhập email"
          disabled={busy}
          error={errors.email?.message}
          invalid={Boolean(errors.email)}
          {...emailFieldProps}
        />
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
        <PrimaryCtaButton type="submit" disabled={busy} aria-disabled={busy}>
          {busy ? 'ĐANG GỬI...' : 'GỬI OTP'}
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
