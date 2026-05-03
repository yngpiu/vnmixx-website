'use client';

import { BirthDatePicker } from '@/modules/auth/components/birth-date-picker';
import { GenderSelect, type GenderValue } from '@/modules/auth/components/gender-select';
import { useRegister } from '@/modules/auth/hooks/use-auth';
import { LabeledCheckbox } from '@/modules/common/components/labeled-checkbox';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const regexPhoneNumber = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;
const GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;

const signupSchema = z
  .object({
    fullName: z.string().min(1, { message: 'Họ và tên không được để trống.' }),
    email: z.email({ message: 'Email không hợp lệ.' }),
    phoneNumber: z
      .string()
      .trim()
      .min(1, { message: 'Điện thoại không được để trống.' })
      .regex(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng.' }),
    dob: z
      .string()
      .min(1, { message: 'Vui lòng chọn ngày sinh.' })
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Ngày sinh không hợp lệ.' }),
    gender: z
      .string()
      .min(1, { message: 'Vui lòng chọn giới tính.' })
      .refine((value) => GENDER_VALUES.includes(value as (typeof GENDER_VALUES)[number]), {
        message: 'Giới tính không hợp lệ.',
      }),
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
      dob: '',
      gender: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  const {
    control,
    register,
    handleSubmit,
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

  const gender = useWatch({ control, name: 'gender' });
  const dob = useWatch({ control, name: 'dob' });
  const busy = registerMutation.isPending;
  const isSubmitDisabled = busy;

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
        gender: values.gender as 'MALE' | 'FEMALE' | 'OTHER',
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
      <main className="shop-shell-container pb-10 pt-10">
        <h1 className="mb-0 text-center text-[20px] font-semibold leading-[30px] text-foreground uppercase">
          ĐĂNG KÝ
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 grid gap-8 p-0 md:grid-cols-2"
          noValidate
        >
          <div className="space-y-5 px-8 md:pr-16">
            <LabeledInput
              label="Họ và tên"
              name="fullName"
              placeholder="Nhập họ và tên"
              autoComplete="name"
              disabled={busy}
              error={errors.fullName?.message}
              invalid={Boolean(errors.fullName)}
              {...fullNameFieldProps}
            />
            <LabeledInput
              label="Email"
              name="email"
              placeholder="Nhập email"
              type="email"
              autoComplete="email"
              disabled={busy}
              error={errors.email?.message}
              invalid={Boolean(errors.email)}
              {...emailFieldProps}
            />
            <LabeledInput
              label="Điện thoại:"
              name="phoneNumber"
              placeholder="Nhập số điện thoại"
              autoComplete="tel"
              disabled={busy}
              error={errors.phoneNumber?.message}
              invalid={Boolean(errors.phoneNumber)}
              {...phoneNumberFieldProps}
            />

            <BirthDatePicker
              label="Ngày sinh:"
              name="dob"
              placeholder="Ngày sinh..."
              value={dob}
              disabled={busy}
              onValueChange={(next: string | undefined) =>
                setValue('dob', next ?? '', { shouldValidate: true })
              }
              invalid={Boolean(errors.dob)}
              error={errors.dob?.message}
            />
            <GenderSelect
              name="gender"
              label="Giới tính"
              value={
                GENDER_VALUES.includes(gender as GenderValue) ? (gender as GenderValue) : undefined
              }
              disabled={busy}
              onValueChange={(v: GenderValue) => setValue('gender', v, { shouldValidate: true })}
              invalid={Boolean(errors.gender)}
              error={errors.gender?.message}
            />
          </div>

          <div className="space-y-5 px-8 md:pl-16">
            <LabeledInput
              label="Mật khẩu"
              name="password"
              type="password"
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              disabled={busy}
              error={errors.password?.message}
              invalid={Boolean(errors.password)}
              {...passwordFieldProps}
            />
            <LabeledInput
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              disabled={busy}
              error={errors.confirmPassword?.message}
              invalid={Boolean(errors.confirmPassword)}
              {...confirmPasswordFieldProps}
            />

            <div className="pt-2">
              <Controller
                name="termsAccepted"
                control={control}
                render={({ field }) => (
                  <LabeledCheckbox
                    id="termsAccepted"
                    label="Đồng ý với các điều khoản của IVY"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                    invalid={Boolean(errors.termsAccepted)}
                    error={errors.termsAccepted?.message}
                  />
                )}
              />
            </div>

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
              disabled={isSubmitDisabled}
              aria-disabled={isSubmitDisabled}
            >
              ĐĂNG KÝ
            </PrimaryCtaButton>
          </div>
        </form>
      </main>
    </>
  );
}
