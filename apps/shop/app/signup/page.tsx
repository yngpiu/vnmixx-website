'use client';

import { BirthDatePicker } from '@/modules/auth/components/birth-date-picker';
import { GenderSelect, type GenderValue } from '@/modules/auth/components/gender-select';
import { useRegister } from '@/modules/auth/hooks/use-auth';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const signupSchema = z
  .object({
    fullName: z.string().min(1, { message: 'Họ và tên không được để trống.' }),
    email: z
      .string()
      .min(1, { message: 'Email không được để trống.' })
      .email({ message: 'Email không hợp lệ.' }),
    phoneNumber: z.string().min(1, { message: 'Điện thoại không được để trống.' }),
    dob: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Ngày sinh không hợp lệ.' }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    password: z.string().min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }),
    confirmPassword: z.string().min(1, { message: 'Vui lòng nhập lại mật khẩu.' }),
    termsAccepted: z
      .boolean()
      .refine((v) => v === true, { message: 'Bạn cần đồng ý với các điều khoản của IVY.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp.',
  });

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage(): React.JSX.Element {
  const registerMutation = useRegister();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      dob: undefined,
      gender: 'FEMALE',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const fullNameRegistration = register('fullName');
  const emailRegistration = register('email');
  const phoneNumberRegistration = register('phoneNumber');
  const passwordRegistration = register('password');
  const confirmPasswordRegistration = register('confirmPassword');

  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };

  const fullNameFieldProps = omitRegisterName(fullNameRegistration);
  const emailFieldProps = omitRegisterName(emailRegistration);
  const phoneNumberFieldProps = omitRegisterName(phoneNumberRegistration);
  const passwordFieldProps = omitRegisterName(passwordRegistration);
  const confirmPasswordFieldProps = omitRegisterName(confirmPasswordRegistration);

  const gender = watch('gender');
  const dob = watch('dob');
  const termsAccepted = watch('termsAccepted');
  const busy = registerMutation.isPending;

  const onSubmit = async (values: SignupValues): Promise<void> => {
    setFormError(null);
    setMessage(null);
    try {
      const payload: {
        fullName: string;
        email: string;
        phoneNumber: string;
        password: string;
        dob?: string;
        gender: 'MALE' | 'FEMALE' | 'OTHER';
      } = {
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        password: values.password,
        ...(values.dob ? { dob: values.dob } : {}),
        gender: values.gender,
      };
      const backendResponse = await registerMutation.mutateAsync(payload);
      setMessage(backendResponse.message);

      const emailForOtp = backendResponse.email ?? values.email;
      const query = new URLSearchParams({
        email: emailForOtp,
        ...(backendResponse.resendAfter
          ? { resendAfter: String(backendResponse.resendAfter) }
          : {}),
      });
      router.push(`/otp?${query.toString()}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-10 pt-10">
        <h1 className="mb-0 text-center text-[20px] font-semibold leading-[30px] text-foreground uppercase">
          ĐĂNG KÝ
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 grid gap-8 p-0 md:grid-cols-2"
          noValidate
        >
          <div className="space-y-5 px-8 md:pr-16">
            <Field data-invalid={Boolean(errors.fullName)} className="gap-0">
              <LabeledInput
                label="Họ và tên"
                name="fullName"
                placeholder="Nhập họ và tên"
                autoComplete="name"
                disabled={busy}
                {...fullNameFieldProps}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName ? (
                <FieldError errors={[{ message: errors.fullName.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.email)} className="gap-0">
              <LabeledInput
                label="Email"
                name="email"
                placeholder="Nhập email"
                type="email"
                autoComplete="email"
                disabled={busy}
                {...emailFieldProps}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <FieldError errors={[{ message: errors.email.message }]} /> : null}
            </Field>

            <Field data-invalid={Boolean(errors.phoneNumber)} className="gap-0">
              <LabeledInput
                label="Điện thoại:"
                name="phoneNumber"
                placeholder="Nhập số điện thoại"
                autoComplete="tel"
                disabled={busy}
                {...phoneNumberFieldProps}
                aria-invalid={Boolean(errors.phoneNumber)}
              />
              {errors.phoneNumber ? (
                <FieldError errors={[{ message: errors.phoneNumber.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.dob)} className="gap-0">
              <BirthDatePicker
                label="Ngày sinh:"
                name="dob"
                placeholder="Ngày sinh..."
                value={dob}
                disabled={busy}
                onValueChange={(next: string | undefined) =>
                  setValue('dob', next, { shouldValidate: true })
                }
                invalid={Boolean(errors.dob)}
              />
              {errors.dob ? <FieldError errors={[{ message: errors.dob.message }]} /> : null}
            </Field>

            <Field data-invalid={Boolean(errors.gender)} className="gap-0">
              <GenderSelect
                name="gender"
                label="Giới tính"
                value={gender as GenderValue}
                disabled={busy}
                onValueChange={(v: GenderValue) => setValue('gender', v, { shouldValidate: true })}
                invalid={Boolean(errors.gender)}
              />
              {errors.gender ? <FieldError errors={[{ message: errors.gender.message }]} /> : null}
            </Field>
          </div>

          <div className="space-y-5 px-8 md:pl-16">
            <Field data-invalid={Boolean(errors.password)} className="gap-0">
              <LabeledInput
                label="Mật khẩu"
                name="password"
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
                disabled={busy}
                {...passwordFieldProps}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password ? (
                <FieldError errors={[{ message: errors.password.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.confirmPassword)} className="gap-0">
              <LabeledInput
                label="Nhập lại mật khẩu"
                name="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={busy}
                {...confirmPasswordFieldProps}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword ? (
                <FieldError errors={[{ message: errors.confirmPassword.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.termsAccepted)} className="gap-0">
              <div className="pt-2 space-y-2">
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="termsAccepted"
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(Boolean(v))}
                        disabled={busy}
                        aria-invalid={Boolean(errors.termsAccepted)}
                      />
                      <label
                        htmlFor="termsAccepted"
                        className="text-sm leading-relaxed text-muted-foreground"
                      >
                        Đồng ý với các điều khoản của IVY
                      </label>
                    </div>
                  )}
                />
                {errors.termsAccepted ? (
                  <FieldError errors={[{ message: errors.termsAccepted.message }]} />
                ) : null}
              </div>
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

            <PrimaryCtaButton
              type="submit"
              className="mt-2"
              disabled={!termsAccepted || busy}
              aria-disabled={!termsAccepted || busy}
            >
              ĐĂNG KÝ
            </PrimaryCtaButton>
          </div>
        </form>
      </main>
    </>
  );
}
