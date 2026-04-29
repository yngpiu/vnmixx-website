'use client';

import { changeMyCustomerPasswordAction } from '@/modules/account/actions/change-password';
import { getMyCustomerProfile, updateMyCustomerProfile } from '@/modules/account/api/profile';
import type { CustomerGender } from '@/modules/account/types/profile';
import { BirthDatePicker } from '@/modules/auth/components/birth-date-picker';
import { GenderSelect, type GenderValue } from '@/modules/auth/components/gender-select';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { uploadMyAvatar } from '@/modules/media/api/media';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError } from '@repo/ui/components/ui/field';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, { message: 'Họ và tên không được để trống.' }),
  phoneNumber: z.string().trim().min(1, { message: 'Số điện thoại không được để trống.' }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email không được để trống.' })
    .email({ message: 'Email không hợp lệ.' }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Ngày sinh không hợp lệ.',
    }),
});

type ProfileValues = z.infer<typeof profileSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Mật khẩu hiện tại không được để trống.' }),
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

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function normalizeDateOfBirth(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }
  const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmedValue);
  if (yyyyMmDdMatch) {
    return `${yyyyMmDdMatch[1]}-${yyyyMmDdMatch[2]}-${yyyyMmDdMatch[3]}`;
  }
  const ddMmYyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedValue);
  if (ddMmYyyyMatch) {
    return `${ddMmYyyyMatch[3]}-${ddMmYyyyMatch[2]}-${ddMmYyyyMatch[1]}`;
  }
  return undefined;
}

function getNameInitials(fullName?: string): string {
  if (!fullName) {
    return '?';
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const firstPart = parts.at(0);
  if (!firstPart) {
    return '?';
  }
  if (parts.length === 1) {
    return firstPart.slice(0, 1).toUpperCase();
  }
  const lastPart = parts.at(-1) ?? firstPart;
  return `${firstPart.slice(0, 1)}${lastPart.slice(0, 1)}`.toUpperCase();
}

export default function AccountPage(): React.JSX.Element {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState<boolean>(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState<boolean>(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreviewUrl, setLocalAvatarPreviewUrl] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ['shop', 'me', 'profile'],
    queryFn: getMyCustomerProfile,
  });
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      gender: 'FEMALE',
      dob: undefined,
    },
  });
  const {
    register,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = profileForm;
  const changePasswordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const {
    register: registerChangePassword,
    handleSubmit: handleSubmitChangePassword,
    reset: resetChangePasswordForm,
    formState: { errors: changePasswordErrors },
  } = changePasswordForm;
  const updateProfileMutation = useMutation({
    mutationFn: updateMyCustomerProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['shop', 'me', 'profile'], updatedProfile);
      reset({
        fullName: updatedProfile.fullName,
        phoneNumber: updatedProfile.phoneNumber,
        email: updatedProfile.email,
        gender: (updatedProfile.gender ?? 'FEMALE') as GenderValue,
        dob: normalizeDateOfBirth(updatedProfile.dob),
      });
      if (localAvatarPreviewUrl) {
        URL.revokeObjectURL(localAvatarPreviewUrl);
      }
      setLocalAvatarPreviewUrl(null);
      setPendingAvatarFile(null);
      toast.success('Cập nhật thông tin thành công.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thông tin.');
    },
  });
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const result = await changeMyCustomerPasswordAction(payload);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công.');
      resetChangePasswordForm();
      setIsChangePasswordDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.');
    },
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }
    reset({
      fullName: profileQuery.data.fullName,
      phoneNumber: profileQuery.data.phoneNumber,
      email: profileQuery.data.email,
      gender: (profileQuery.data.gender ?? 'FEMALE') as GenderValue,
      dob: normalizeDateOfBirth(profileQuery.data.dob),
    });
  }, [profileQuery.data, reset]);

  useEffect(() => {
    return () => {
      if (localAvatarPreviewUrl) {
        URL.revokeObjectURL(localAvatarPreviewUrl);
      }
    };
  }, [localAvatarPreviewUrl]);

  const isBusy = profileQuery.isLoading || isSubmittingProfile;
  const isChangingPassword = changePasswordMutation.isPending;
  const canSubmit = isDirty || pendingAvatarFile !== null;
  const fullNameRegistration = register('fullName');
  const phoneNumberRegistration = register('phoneNumber');
  const emailRegistration = register('email');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  const gender = watch('gender');
  const dob = watch('dob');
  const avatarUrl = localAvatarPreviewUrl ?? profileQuery.data?.avatarUrl ?? undefined;

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) {
      return;
    }
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ tệp ảnh cho avatar.');
      return;
    }
    if (localAvatarPreviewUrl) {
      URL.revokeObjectURL(localAvatarPreviewUrl);
    }
    setPendingAvatarFile(selectedFile);
    setLocalAvatarPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const onSubmit = async (values: ProfileValues): Promise<void> => {
    setIsSubmittingProfile(true);
    try {
      let nextAvatarUrl = profileQuery.data?.avatarUrl ?? undefined;
      if (pendingAvatarFile) {
        nextAvatarUrl = await uploadMyAvatar(pendingAvatarFile);
      }
      const payload: {
        fullName: string;
        dob?: string;
        gender: CustomerGender;
        avatarUrl?: string;
      } = {
        fullName: values.fullName.trim().replace(/\s+/g, ' '),
        gender: values.gender,
        ...(values.dob ? { dob: values.dob } : {}),
        ...(nextAvatarUrl ? { avatarUrl: nextAvatarUrl } : {}),
      };
      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thông tin.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (values: ChangePasswordValues): Promise<void> => {
    await changePasswordMutation.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  const closeChangePasswordDialog = (): void => {
    setIsChangePasswordDialogOpen(false);
    resetChangePasswordForm();
  };

  if (profileQuery.isLoading) {
    return (
      <main className="shop-shell-container pb-16 pt-8">
        <p className="text-sm text-muted-foreground">Đang tải thông tin tài khoản...</p>
      </main>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="shop-shell-container pb-16 pt-8">
        <p className="text-sm text-destructive" role="alert">
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : 'Không tải được thông tin tài khoản.'}
        </p>
      </main>
    );
  }

  return (
    <main className="shop-shell-container pb-16 pt-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span className="mx-2">-</span>
        <span>Thông tin tài khoản</span>
      </nav>

      <section className="mt-8 grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
        <aside className="self-start border border-border rounded-tl-[20px] rounded-tr-none rounded-bl-none rounded-br-[20px] p-4">
          <div className="mb-3 border-b border-border pb-3 text-[20px] font-semibold text-foreground">
            {profileQuery.data.fullName}
          </div>
          <ul className="space-y-0.5">
            {ACCOUNT_MENU_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground',
                      isActive ? 'bg-muted text-foreground font-semibold' : undefined,
                    )}
                  >
                    <ItemIcon className="size-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        <div>
          <h1 className="text-[24px] leading-[30px] font-semibold uppercase text-foreground">
            Tài khoản của tôi
          </h1>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 max-w-[560px] space-y-5"
            noValidate
          >
            <Field className="gap-0">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="avatar-file"
                    className="group relative block size-16 cursor-pointer overflow-hidden rounded-full border border-border bg-muted"
                  >
                    <Avatar className="size-full ring-0">
                      <AvatarImage src={avatarUrl || undefined} alt="Ảnh đại diện" />
                      <AvatarFallback>{getNameInitials(profileQuery.data.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      <CameraIcon className="size-5 text-white" />
                    </div>
                    <input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                      disabled={isBusy}
                    />
                  </label>
                  <div className="text-sm text-muted-foreground">Ảnh đại diện</div>
                </div>
              </div>
            </Field>

            <Field data-invalid={Boolean(errors.fullName)} className="gap-0">
              <LabeledInput
                label="Họ và tên"
                name="fullName"
                placeholder="Nhập họ và tên"
                disabled={isBusy}
                {...omitRegisterName(fullNameRegistration)}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName ? (
                <FieldError errors={[{ message: errors.fullName.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.phoneNumber)} className="gap-0">
              <LabeledInput
                label="Số điện thoại"
                name="phoneNumber"
                placeholder="Nhập số điện thoại"
                autoComplete="tel"
                disabled
                readOnly
                {...omitRegisterName(phoneNumberRegistration)}
                aria-invalid={Boolean(errors.phoneNumber)}
              />
              <p className="text-xs text-muted-foreground">
                Số điện thoại hiện chưa hỗ trợ cập nhật.
              </p>
              {errors.phoneNumber ? (
                <FieldError errors={[{ message: errors.phoneNumber.message }]} />
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.email)} className="gap-0">
              <LabeledInput
                label="Email"
                name="email"
                type="email"
                disabled
                readOnly
                {...omitRegisterName(emailRegistration)}
                aria-invalid={Boolean(errors.email)}
              />
              <p className="text-xs text-muted-foreground">Email hiện chưa hỗ trợ cập nhật.</p>
              {errors.email ? <FieldError errors={[{ message: errors.email.message }]} /> : null}
            </Field>

            <Field data-invalid={Boolean(errors.gender)} className="gap-0">
              <GenderSelect
                name="gender"
                label="Giới tính"
                value={gender as GenderValue}
                disabled={isBusy}
                onValueChange={(value: GenderValue) =>
                  setValue('gender', value, { shouldValidate: true, shouldDirty: true })
                }
                invalid={Boolean(errors.gender)}
              />
              {errors.gender ? <FieldError errors={[{ message: errors.gender.message }]} /> : null}
            </Field>

            <Field data-invalid={Boolean(errors.dob)} className="gap-0">
              <BirthDatePicker
                label="Ngày sinh"
                name="dob"
                placeholder="Ngày sinh..."
                value={dob}
                disabled={isBusy}
                onValueChange={(value: string | undefined) =>
                  setValue('dob', value, { shouldValidate: true, shouldDirty: true })
                }
                invalid={Boolean(errors.dob)}
              />
              {errors.dob ? <FieldError errors={[{ message: errors.dob.message }]} /> : null}
            </Field>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PrimaryCtaButton
                type="submit"
                className="w-auto min-w-[140px]"
                disabled={isBusy || !canSubmit}
                aria-disabled={isBusy || !canSubmit}
              >
                {isSubmittingProfile ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT'}
              </PrimaryCtaButton>
              <PrimaryCtaButton
                ctaVariant="outline"
                type="button"
                className="w-auto min-w-[140px]"
                onClick={() => setIsChangePasswordDialogOpen(true)}
              >
                ĐỔI MẬT KHẨU
              </PrimaryCtaButton>
            </div>
          </form>
        </div>
      </section>
      <Dialog
        open={isChangePasswordDialogOpen}
        onOpenChange={(isOpen: boolean) => {
          setIsChangePasswordDialogOpen(isOpen);
          if (!isOpen) {
            resetChangePasswordForm();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-2rem)] sm:max-w-[1080px] rounded-none bg-white px-12 py-10 text-foreground ring-0"
        >
          <button
            type="button"
            className="absolute right-6 top-5 text-[#9B9B9B] transition-colors hover:text-foreground"
            aria-label="Đóng"
            onClick={closeChangePasswordDialog}
          >
            <XIcon className="size-6" />
          </button>
          <DialogTitle className="text-center text-[30px] leading-[52px] font-semibold uppercase tracking-wide">
            Đổi mật khẩu
          </DialogTitle>
          <DialogDescription className="sr-only">
            Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật mật khẩu tài khoản.
          </DialogDescription>
          <form
            onSubmit={handleSubmitChangePassword(handleChangePasswordSubmit)}
            className="mx-auto mt-8 w-full max-w-[820px] space-y-8"
            noValidate
          >
            <Field data-invalid={Boolean(changePasswordErrors.currentPassword)} className="gap-0">
              <LabeledInput
                type="password"
                label="Mật khẩu hiện tại"
                name="currentPassword"
                disabled={isChangingPassword}
                autoComplete="current-password"
                {...omitRegisterName(registerChangePassword('currentPassword'))}
              />
              {changePasswordErrors.currentPassword ? (
                <FieldError errors={[{ message: changePasswordErrors.currentPassword.message }]} />
              ) : null}
            </Field>
            <Field data-invalid={Boolean(changePasswordErrors.newPassword)} className="gap-0">
              <LabeledInput
                type="password"
                label="Mật khẩu mới"
                name="newPassword"
                disabled={isChangingPassword}
                autoComplete="new-password"
                {...omitRegisterName(registerChangePassword('newPassword'))}
              />
              {changePasswordErrors.newPassword ? (
                <FieldError errors={[{ message: changePasswordErrors.newPassword.message }]} />
              ) : null}
            </Field>
            <Field data-invalid={Boolean(changePasswordErrors.confirmPassword)} className="gap-0">
              <LabeledInput
                type="password"
                label="Nhập lại Mật khẩu mới"
                name="confirmPassword"
                disabled={isChangingPassword}
                autoComplete="new-password"
                {...omitRegisterName(registerChangePassword('confirmPassword'))}
              />
              {changePasswordErrors.confirmPassword ? (
                <FieldError errors={[{ message: changePasswordErrors.confirmPassword.message }]} />
              ) : null}
            </Field>
            <PrimaryCtaButton
              type="submit"
              disabled={isChangingPassword}
              aria-disabled={isChangingPassword}
            >
              {isChangingPassword ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT'}
            </PrimaryCtaButton>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
