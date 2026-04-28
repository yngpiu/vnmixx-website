'use client';

import { useLogout } from '@/modules/auth/hooks/use-auth';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { PageViewHeader } from '@/modules/common/components/page-view-header';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { uploadMedia } from '@/modules/media/api/media';
import {
  changeMyPassword,
  getMyEmployeeProfile,
  updateMyEmployeeProfile,
} from '@/modules/settings/api/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Button } from '@repo/ui/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/components/ui/input-group';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, KeyRoundIcon, UploadCloudIcon, UserIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const regexPhoneNumber = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ tên.')
    .max(100, 'Họ tên không được vượt quá 100 ký tự.'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự.')
    .regex(regexPhoneNumber, 'Số điện thoại không đúng định dạng hợp lệ.'),
  avatarUrl: z.string().trim().max(500, 'URL avatar không được vượt quá 500 ký tự.'),
});

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
type SettingsTab = 'profile' | 'password';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.')
      .max(72, 'Mật khẩu mới không được vượt quá 72 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Xác nhận mật khẩu không khớp.',
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function extractInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function SettingsView() {
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);
  const logout = useLogout();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const profileForm = useForm<UpdateProfileFormValues>({
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      avatarUrl: '',
    },
  });
  const passwordForm = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    clearErrors,
    reset,
    watch,
  } = profileForm;
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isDirty: isPasswordDirty },
    setError: setPasswordError,
    clearErrors: clearPasswordErrors,
    reset: resetPasswordForm,
  } = passwordForm;
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreviewUrl, setLocalAvatarPreviewUrl] = useState<string | null>(null);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const clearPendingAvatarSelection = useCallback((): void => {
    setLocalAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setPendingAvatarFile(null);
  }, []);
  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyEmployeeProfile,
  });
  const updateProfileMutation = useMutation({
    mutationFn: updateMyEmployeeProfile,
    onSuccess: (updatedProfile) => {
      clearPendingAvatarSelection();
      if (currentUser) {
        setUser({
          ...currentUser,
          fullName: updatedProfile.fullName,
          avatarUrl: updatedProfile.avatarUrl,
        });
      }
      reset({
        fullName: updatedProfile.fullName,
        phoneNumber: updatedProfile.phoneNumber,
        avatarUrl: updatedProfile.avatarUrl ?? '',
      });
      toast.success('Đã lưu cài đặt cá nhân.');
    },
  });
  const changePasswordMutation = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: () => {
      resetPasswordForm();
      toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      logout.mutate();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });
  const serverAvatarUrl = watch('avatarUrl');
  const previewName = watch('fullName');
  const displayAvatarSrc =
    localAvatarPreviewUrl ?? (serverAvatarUrl.trim() ? serverAvatarUrl : undefined);
  const avatarFallback = useMemo(
    () => extractInitials(previewName || currentUser?.fullName || 'NV'),
    [currentUser?.fullName, previewName],
  );
  const isProfileFormSubmittable =
    (isDirty || pendingAvatarFile !== null) && !updateProfileMutation.isPending;
  const settingsMenus: ReadonlyArray<{ key: SettingsTab; label: string; icon: typeof UserIcon }> = [
    { key: 'profile', label: 'Tài khoản', icon: UserIcon },
    { key: 'password', label: 'Mật khẩu', icon: KeyRoundIcon },
  ];
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab === 'password') {
      setActiveTab('password');
      return;
    }
    if (tab === 'profile') {
      setActiveTab('profile');
    }
  }, [tab]);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) {
      return;
    }
    clearPendingAvatarSelection();
    reset({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
      avatarUrl: profile.avatarUrl ?? '',
    });
  }, [profileQuery.data, reset, clearPendingAvatarSelection]);

  function handleAvatarFileSelect(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      setError('avatarUrl', { message: 'Vui lòng chọn tệp hình ảnh.' });
      return;
    }
    clearErrors('avatarUrl');
    setLocalAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return URL.createObjectURL(file);
    });
    setPendingAvatarFile(file);
  }

  async function handleProfileSubmit(values: UpdateProfileFormValues): Promise<void> {
    clearErrors('root');
    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (fieldName === 'fullName' || fieldName === 'phoneNumber' || fieldName === 'avatarUrl') {
          setError(fieldName, { message: issue.message });
        }
      }
      return;
    }
    try {
      let nextAvatarUrl = parsed.data.avatarUrl.trim();
      if (pendingAvatarFile) {
        const uploadedFiles = await uploadMedia([pendingAvatarFile], 'avatars');
        const uploadedFile = uploadedFiles[0];
        if (!uploadedFile) {
          toast.error('Tải ảnh lên thất bại.');
          return;
        }
        nextAvatarUrl = uploadedFile.url;
      }
      await updateProfileMutation.mutateAsync({
        fullName: parsed.data.fullName,
        phoneNumber: parsed.data.phoneNumber,
        ...(nextAvatarUrl ? { avatarUrl: nextAvatarUrl } : {}),
      });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function handleCancelProfileChanges(): void {
    const profile = profileQuery.data;
    clearErrors();
    clearPendingAvatarSelection();
    if (!profile) {
      reset({
        fullName: '',
        phoneNumber: '',
        avatarUrl: '',
      });
      return;
    }
    reset({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
      avatarUrl: profile.avatarUrl ?? '',
    });
  }

  function handlePasswordSubmit(values: ChangePasswordFormValues): void {
    clearPasswordErrors('root');
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (
          fieldName === 'currentPassword' ||
          fieldName === 'newPassword' ||
          fieldName === 'confirmPassword'
        ) {
          setPasswordError(fieldName, { message: issue.message });
        }
      }
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  }

  function handleCancelPasswordChanges(): void {
    clearPasswordErrors();
    resetPasswordForm();
    setIsCurrentPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  }

  if (profileQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải cài đặt cá nhân…</p>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {profileQuery.error instanceof Error ? profileQuery.error.message : 'Không tải được hồ sơ.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageViewHeader
        title="Cài đặt"
        description="Quản lý thông tin tài khoản nhân viên và tùy chỉnh giao diện."
      />
      <div className="h-px w-full bg-border" />
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-1">
          {settingsMenus.map((menu) => {
            const MenuIcon = menu.icon;
            return (
              <button
                key={menu.key}
                type="button"
                onClick={() => setActiveTab(menu.key)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  menu.key === activeTab
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <MenuIcon className="size-4" />
                {menu.label}
              </button>
            );
          })}
        </aside>
        <div className="space-y-8">
          {activeTab === 'profile' ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Tài khoản</h3>
                <p className="text-sm text-muted-foreground">
                  Cập nhật tên, số điện thoại và ảnh đại diện của tài khoản nhân viên.
                </p>
              </div>
              <form
                className="max-w-xl space-y-5"
                onSubmit={handleSubmit(handleProfileSubmit)}
                noValidate
              >
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel>Ảnh đại diện</FieldLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        {displayAvatarSrc ? (
                          <AvatarImage src={displayAvatarSrc} alt="Ảnh đại diện" />
                        ) : null}
                        <AvatarFallback className="text-base">{avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={updateProfileMutation.isPending}
                          asChild
                        >
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarFileSelect}
                            />
                            <UploadCloudIcon className="mr-2 size-4" />
                            Chọn ảnh
                          </label>
                        </Button>
                      </div>
                    </div>
                    <FieldError errors={[errors.avatarUrl]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="settings-full-name">Họ và tên</FieldLabel>
                    <Input
                      id="settings-full-name"
                      placeholder="Nguyễn Văn A"
                      {...register('fullName')}
                    />
                    <FieldError errors={[errors.fullName]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="settings-phone-number">Số điện thoại</FieldLabel>
                    <Input
                      id="settings-phone-number"
                      placeholder="0901234567"
                      {...register('phoneNumber')}
                    />
                    <FieldError errors={[errors.phoneNumber]} />
                  </Field>
                </FieldGroup>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={!isProfileFormSubmittable}>
                    {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                  {isDirty || pendingAvatarFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={updateProfileMutation.isPending}
                      onClick={handleCancelProfileChanges}
                    >
                      Huỷ
                    </Button>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}
          {activeTab === 'password' ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Mật khẩu</h3>
                <p className="text-sm text-muted-foreground">
                  Nhập mật khẩu hiện tại và mật khẩu mới để bảo mật tài khoản.
                </p>
              </div>
              <form
                className="max-w-xl space-y-5"
                onSubmit={handleSubmitPassword(handlePasswordSubmit)}
                noValidate
              >
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="settings-current-password">Mật khẩu hiện tại</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="settings-current-password"
                        type={isCurrentPasswordVisible ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...registerPassword('currentPassword')}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setIsCurrentPasswordVisible((prev) => !prev)}
                          aria-label={
                            isCurrentPasswordVisible
                              ? 'Ẩn mật khẩu hiện tại'
                              : 'Hiện mật khẩu hiện tại'
                          }
                          disabled={changePasswordMutation.isPending || logout.isPending}
                        >
                          {isCurrentPasswordVisible ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={[passwordErrors.currentPassword]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="settings-new-password">Mật khẩu mới</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="settings-new-password"
                        type={isNewPasswordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...registerPassword('newPassword')}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setIsNewPasswordVisible((prev) => !prev)}
                          aria-label={
                            isNewPasswordVisible ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'
                          }
                          disabled={changePasswordMutation.isPending || logout.isPending}
                        >
                          {isNewPasswordVisible ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={[passwordErrors.newPassword]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="settings-confirm-password">
                      Xác nhận mật khẩu mới
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="settings-confirm-password"
                        type={isConfirmPasswordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...registerPassword('confirmPassword')}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                          aria-label={
                            isConfirmPasswordVisible
                              ? 'Ẩn xác nhận mật khẩu mới'
                              : 'Hiện xác nhận mật khẩu mới'
                          }
                          disabled={changePasswordMutation.isPending || logout.isPending}
                        >
                          {isConfirmPasswordVisible ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={[passwordErrors.confirmPassword]} />
                  </Field>
                </FieldGroup>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={
                      !isPasswordDirty || changePasswordMutation.isPending || logout.isPending
                    }
                  >
                    {changePasswordMutation.isPending ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                  </Button>
                  {isPasswordDirty ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={changePasswordMutation.isPending || logout.isPending}
                      onClick={handleCancelPasswordChanges}
                    >
                      Huỷ
                    </Button>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
