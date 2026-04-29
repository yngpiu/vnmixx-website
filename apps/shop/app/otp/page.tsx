'use client';

import { useResendOtp, useVerifyOtp } from '@/modules/auth/hooks/use-auth';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, { message: 'OTP phải là mã số gồm 6 chữ số' }),
});

const OTP_INPUT_CLASS_NAME =
  'h-[48px] w-full box-border rounded-[4px] border border-[#E7E8E9] bg-white px-[15px] py-[15px] ' +
  'text-[14px] leading-[16px] text-[#57585A] shadow-none placeholder:text-muted-foreground/70 ' +
  'focus-visible:ring-0 focus-visible:border-[#E7E8E9] disabled:bg-input/50 disabled:opacity-50';

type OtpValues = z.infer<typeof otpSchema>;

export default function OtpPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();

  const email = searchParams.get('email') ?? '';
  const initialResendAfter = useMemo(() => {
    const raw = searchParams.get('resendAfter');
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }, [searchParams]);

  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resendAfterSeconds, setResendAfterSeconds] = useState<number | null>(initialResendAfter);

  useEffect(() => {
    setResendAfterSeconds(initialResendAfter);
  }, [initialResendAfter]);

  useEffect(() => {
    if (resendAfterSeconds === null) return;
    if (resendAfterSeconds <= 0) return;
    const intervalId = window.setInterval(() => {
      setResendAfterSeconds((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAfterSeconds]);

  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const otpRegistration = register('otp');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const otpFieldProps = omitRegisterName(otpRegistration);

  const busy = verifyOtpMutation.isPending || resendOtpMutation.isPending;

  const onSubmit = async (values: OtpValues): Promise<void> => {
    setFormError(null);
    setMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setFormError('Thiếu email xác thực. Vui lòng đăng ký lại hoặc yêu cầu OTP mới.');
      return;
    }

    try {
      await verifyOtpMutation.mutateAsync({ email: emailTrimmed, otp: values.otp });
      router.push('/login?verified=1');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const onResend = async (): Promise<void> => {
    setFormError(null);
    setMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setFormError('Thiếu email xác thực. Vui lòng đăng ký lại hoặc yêu cầu OTP mới.');
      return;
    }

    try {
      const backendResponse = await resendOtpMutation.mutateAsync({ email: emailTrimmed });
      setMessage(backendResponse.message);
      setResendAfterSeconds(backendResponse.resendAfter ?? null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const resendDisabled = resendAfterSeconds !== null && resendAfterSeconds > 0;

  return (
    <>
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-10 pt-12">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto w-full max-w-[460px] space-y-5"
          noValidate
        >
          <div className="space-y-2 text-center">
            <h1 className="mb-0 text-[20px] font-semibold leading-[30px] text-foreground">
              Đăng nhập bằng OTP
            </h1>
            <p className="text-[14px] leading-[24px] text-muted-foreground">
              {email
                ? `(Mã xác thực đã được gửi tới ${email})`
                : '(Mã xác thực đã được gửi tới email của bạn)'}
            </p>
          </div>

          <Field data-invalid={Boolean(errors.otp)} className="gap-0">
            <input
              name="otp"
              placeholder="Nhập mã xác thực"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={busy}
              {...otpFieldProps}
              aria-invalid={Boolean(errors.otp)}
              className={OTP_INPUT_CLASS_NAME}
            />
            {errors.otp ? <FieldError errors={[{ message: errors.otp.message }]} /> : null}
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

          {message ? (
            <p className="text-muted-foreground text-sm leading-relaxed" role="status">
              {message}
            </p>
          ) : null}

          <PrimaryCtaButton type="submit" disabled={busy} aria-disabled={busy} className="mt-2">
            GỬI ĐI
          </PrimaryCtaButton>

          <PrimaryCtaButton
            ctaVariant="outline"
            type="button"
            onClick={onResend}
            disabled={busy || resendDisabled}
            aria-disabled={busy || resendDisabled}
            className="mt-2"
          >
            {resendAfterSeconds !== null && resendAfterSeconds > 0
              ? `Gửi lại sau ${resendAfterSeconds}s`
              : 'Gửi lại OTP'}
          </PrimaryCtaButton>
        </form>
      </main>
    </>
  );
}
