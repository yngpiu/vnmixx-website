'use client';

import { AuthActionError, useLogin } from '@/modules/auth/hooks/use-auth';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ShopFooter } from '@/modules/footer/components/shop-footer';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const phoneRegex = /^(\+?84[35879]\d{8}|0[35879]\d{8})$/;

function normalizePhoneNumber(value: string): string {
  return value.trim().replace(/[\s-().]/g, '');
}

function isValidEmailOrPhone(value: string): boolean {
  const normalizedPhone = normalizePhoneNumber(value);
  if (phoneRegex.test(normalizedPhone)) return true;
  return z.string().email().safeParse(value.trim()).success;
}

function isValidEmail(value: string): boolean {
  return z.string().email().safeParse(value.trim()).success;
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email/SDT không được để trống.' })
    .refine(isValidEmailOrPhone, { message: 'Email hoặc số điện thoại không hợp lệ.' }),
  password: z
    .string()
    .min(1, { message: 'Mật khẩu không được để trống.' })
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage(): React.JSX.Element {
  const loginMutation = useLogin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const isVerifiedSuccess = searchParams.get('verified') === '1';

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const busy = loginMutation.isPending;

  const onSubmit = async (values: LoginValues): Promise<void> => {
    setFormError(null);
    try {
      await loginMutation.mutateAsync(values);
    } catch (err) {
      if (err instanceof AuthActionError && err.code === 'AUTH_EMAIL_UNVERIFIED') {
        const metaEmail =
          typeof err.meta === 'object' && err.meta !== null && 'email' in err.meta
            ? String((err.meta as { email?: unknown }).email ?? '')
            : '';
        const emailForOtp = isValidEmail(values.email) ? values.email.trim() : metaEmail.trim();
        if (isValidEmail(emailForOtp)) {
          router.push(`/otp?email=${encodeURIComponent(emailForOtp)}`);
          return;
        }
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormError(message);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const emailRegistration = register('email');
  const passwordRegistration = register('password');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const emailFieldProps = omitRegisterName(emailRegistration);
  const passwordFieldProps = omitRegisterName(passwordRegistration);

  return (
    <>
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-10 pt-12">
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
              <Field data-invalid={Boolean(errors.email)} className="gap-0">
                <LabeledInput
                  label="Email/SDT"
                  name="email"
                  type="text"
                  autoComplete="email"
                  placeholder="Nhập email hoặc số điện thoại"
                  disabled={busy}
                  {...emailFieldProps}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <FieldError errors={[{ message: errors.email.message }]} /> : null}
              </Field>

              <Field data-invalid={Boolean(errors.password)} className="gap-0">
                <LabeledInput
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  disabled={busy}
                  {...passwordFieldProps}
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? (
                  <FieldError errors={[{ message: errors.password.message }]} />
                ) : null}
              </Field>

              <div className="flex items-center justify-end">
                <Link
                  href="#"
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

      <ShopFooter />
    </>
  );
}
