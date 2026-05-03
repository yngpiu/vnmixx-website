'use client';

import { useLogin } from '@/modules/auth/hooks/use-auth';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const regexPhoneNumber = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;

function normalizePhoneNumber(value: string): string {
  return value.trim();
}

function isValidEmailOrPhone(value: string): boolean {
  const normalizedPhone = normalizePhoneNumber(value);
  if (regexPhoneNumber.test(normalizedPhone)) return true;
  return z.email().safeParse(value.trim()).success;
}

const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, { message: 'Email hoặc số điện thoại không được để trống.' })
    .refine(isValidEmailOrPhone, { message: 'Email hoặc số điện thoại không hợp lệ.' }),
  password: z
    .string()
    .min(1, { message: 'Mật khẩu không được để trống.' })
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.JSX.Element {
  const loginMutation = useLogin();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const isVerifiedSuccess = searchParams.get('verified') === '1';
  const isResetPasswordSuccess = searchParams.get('reset') === '1';

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: '',
    },
  });

  const busy = loginMutation.isPending;

  const onSubmit = async (values: LoginValues): Promise<void> => {
    setFormError(null);
    try {
      await loginMutation.mutateAsync(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormError(message);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const emailOrPhoneRegistration = register('emailOrPhone');
  const passwordRegistration = register('password');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const emailOrPhoneFieldProps = omitRegisterName(emailOrPhoneRegistration);
  const passwordFieldProps = omitRegisterName(passwordRegistration);

  return (
    <>
      <main className="shop-shell-container pb-10 pt-12">
        <section className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-0 md:relative">
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border"
            aria-hidden="true"
          />

          <div className="px-8  md:pr-16">
            <h1 className="mb-0 text-center text-[20px] font-semibold leading-[30px] text-foreground">
              Bạn đã có tài khoản IVY
            </h1>
            <p className="mb-0 mt-3 text-center text-[14px] leading-[24px] text-muted-foreground">
              Nếu bạn đã có tài khoản, hãy đăng nhập để tích lũy điểm thành viên và nhận được những
              ưu đãi tốt hơn!
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
              <LabeledInput
                label="Email hoặc số điện thoại"
                name="emailOrPhone"
                type="text"
                autoComplete="email"
                placeholder="Nhập email hoặc số điện thoại"
                disabled={busy}
                error={errors.emailOrPhone?.message}
                invalid={Boolean(errors.emailOrPhone)}
                {...emailOrPhoneFieldProps}
              />
              <LabeledInput
                label="Mật khẩu"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                disabled={busy}
                error={errors.password?.message}
                invalid={Boolean(errors.password)}
                {...passwordFieldProps}
              />

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  aria-label="Quên mật khẩu"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {formError ? (
                <p
                  className="text-destructive bg-destructive/5 rounded-lg border border-destructive/20 px-3 py-2 text-sm"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}
              {!formError && isVerifiedSuccess ? (
                <p
                  className="text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2 text-sm"
                  role="status"
                >
                  Xác thực email thành công. Vui lòng đăng nhập để tiếp tục.
                </p>
              ) : null}
              {!formError && !isVerifiedSuccess && isResetPasswordSuccess ? (
                <p
                  className="text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2 text-sm"
                  role="status"
                >
                  Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.
                </p>
              ) : null}

              <PrimaryCtaButton type="submit" disabled={busy} aria-disabled={busy}>
                ĐĂNG NHẬP
              </PrimaryCtaButton>
            </form>
          </div>

          <div className="flex flex-col items-center justify-center px-8 py-8 md:items-center md:pl-16">
            <h2 className="mb-0 text-center text-[20px] font-semibold leading-[30px] text-foreground">
              Khách hàng mới của IVY moda
            </h2>
            <p className="mb-0 mt-3 text-center text-[14px] leading-[24px] text-muted-foreground">
              Nếu bạn chưa có tài khoản trên ivymoda.com, hãy sử dụng tùy chọn này để truy cập biểu
              mẫu đăng ký.
              <br />
              Bằng cách cung cấp cho IVY moda thông tin chi tiết của bạn, quá trình mua hàng trên
              ivymoda.com sẽ là một trải nghiệm thú vị và nhanh chóng hơn!
            </p>

            <div className="mt-8 w-full max-w-[360px]">
              <PrimaryCtaButton ctaVariant="outline" asChild>
                <Link href="/signup" aria-label="Đăng ký">
                  ĐĂNG KÝ
                </Link>
              </PrimaryCtaButton>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
