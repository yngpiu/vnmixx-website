'use client';

import {
  createMyCustomerAddress,
  deleteMyCustomerAddress,
  getMyCustomerAddresses,
  updateMyCustomerAddress,
} from '@/modules/account/api/addresses';
import {
  getLocationCities,
  getLocationDistrictsByCityId,
  getLocationWardsByDistrictId,
} from '@/modules/account/api/locations';
import type { CustomerAddress } from '@/modules/account/types/address';
import { LabeledInput } from '@/modules/common/components/labeled-input';
import {
  LabeledInputSelect,
  type LabeledInputSelectOption,
} from '@/modules/common/components/labeled-input-select';
import { LabeledRadioGroup } from '@/modules/common/components/labeled-radio-group';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { ACCOUNT_MENU_ITEMS } from '@/modules/header/constants/account-menu-items';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { toast } from '@repo/ui/components/ui/sonner';
import { cn } from '@repo/ui/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const regexPhoneNumber = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;

const addressSchema = z.object({
  fullName: z.string().trim().min(1, { message: 'Họ tên không được để trống.' }),
  phoneNumber: z
    .string()
    .trim()
    .min(1, { message: 'Số điện thoại không được để trống.' })
    .regex(regexPhoneNumber, { message: 'Số điện thoại không đúng định dạng.' }),
  cityId: z.string().min(1, { message: 'Vui lòng chọn Tỉnh/TP.' }),
  districtId: z.string().min(1, { message: 'Vui lòng chọn Quận/Huyện.' }),
  wardId: z.string().min(1, { message: 'Vui lòng chọn Phường/Xã.' }),
  addressLine: z.string().trim().min(1, { message: 'Địa chỉ chi tiết không được để trống.' }),
  type: z.enum(['HOME', 'OFFICE']),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;
type AddressDialogMode = 'create' | 'edit';

const QUERY_KEYS = {
  addresses: ['shop', 'me', 'addresses'] as const,
  cities: ['shop', 'locations', 'cities'] as const,
};

function toLocationOptions(
  values: { id: number; name: string }[] | undefined,
): LabeledInputSelectOption<string>[] {
  if (!values) {
    return [];
  }
  return values.map((item) => ({ value: String(item.id), label: item.name }));
}

export default function AccountAddressBookPage(): React.JSX.Element {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<AddressDialogMode>('create');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<CustomerAddress | null>(null);
  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      cityId: '',
      districtId: '',
      wardId: '',
      addressLine: '',
      type: 'HOME',
      isDefault: false,
    },
  });
  const {
    register,
    setValue,
    reset,
    clearErrors,
    watch,
    handleSubmit,
    formState: { errors },
  } = addressForm;
  const cityId = watch('cityId');
  const districtId = watch('districtId');
  const wardId = watch('wardId');
  const selectedAddressType = watch('type');
  const isDefaultAddress = watch('isDefault');
  const addressListQuery = useQuery({
    queryKey: QUERY_KEYS.addresses,
    queryFn: getMyCustomerAddresses,
  });
  const citiesQuery = useQuery({
    queryKey: QUERY_KEYS.cities,
    queryFn: getLocationCities,
    staleTime: 1000 * 60 * 30,
  });
  const districtsQuery = useQuery({
    queryKey: ['shop', 'locations', 'districts', cityId],
    queryFn: () => getLocationDistrictsByCityId(Number(cityId)),
    enabled: Boolean(cityId),
  });
  const wardsQuery = useQuery({
    queryKey: ['shop', 'locations', 'wards', districtId],
    queryFn: () => getLocationWardsByDistrictId(Number(districtId)),
    enabled: Boolean(districtId),
  });
  const createAddressMutation = useMutation({
    mutationFn: createMyCustomerAddress,
    onSuccess: () => {
      toast.success('Thêm địa chỉ thành công.');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });
      setIsDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm địa chỉ.');
    },
  });
  const updateAddressMutation = useMutation({
    mutationFn: updateMyCustomerAddress,
    onSuccess: () => {
      toast.success('Cập nhật địa chỉ thành công.');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });
      setIsDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật địa chỉ.');
    },
  });
  const removeAddressMutation = useMutation({
    mutationFn: deleteMyCustomerAddress,
    onSuccess: () => {
      toast.success('Xóa địa chỉ thành công.');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.addresses });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa địa chỉ.');
    },
  });
  const cityOptions = useMemo(() => toLocationOptions(citiesQuery.data), [citiesQuery.data]);
  const districtOptions = useMemo(
    () => toLocationOptions(districtsQuery.data),
    [districtsQuery.data],
  );
  const wardOptions = useMemo(() => toLocationOptions(wardsQuery.data), [wardsQuery.data]);
  const addresses = addressListQuery.data ?? [];
  const isFormSubmitting = createAddressMutation.isPending || updateAddressMutation.isPending;
  const fullNameRegistration = register('fullName');
  const phoneNumberRegistration = register('phoneNumber');
  const addressLineRegistration = register('addressLine');
  const omitRegisterName = <T extends { name?: string }>(registration: T): Omit<T, 'name'> => {
    const { name: registrationName, ...rest } = registration;
    void registrationName;
    return rest;
  };
  useEffect(() => {
    if (!isDialogOpen || !cityId) {
      return;
    }
    if (!districtsQuery.data) {
      return;
    }
    const districtStillExists = districtsQuery.data.some((item) => String(item.id) === districtId);
    if (districtId && !districtStillExists) {
      setValue('districtId', '', { shouldDirty: true });
      setValue('wardId', '', { shouldDirty: true });
      clearErrors(['districtId', 'wardId']);
    }
  }, [cityId, clearErrors, districtId, districtsQuery.data, isDialogOpen, setValue]);
  useEffect(() => {
    if (!isDialogOpen || !districtId) {
      return;
    }
    if (!wardsQuery.data) {
      return;
    }
    const wardId = watch('wardId');
    const wardStillExists = wardsQuery.data.some((item) => String(item.id) === wardId);
    if (wardId && !wardStillExists) {
      setValue('wardId', '', { shouldDirty: true });
      clearErrors('wardId');
    }
  }, [clearErrors, districtId, isDialogOpen, setValue, wardsQuery.data, watch]);
  const closeDialog = (): void => {
    setIsDialogOpen(false);
    setDialogMode('create');
    setEditingAddressId(null);
    reset({
      fullName: '',
      phoneNumber: '',
      cityId: '',
      districtId: '',
      wardId: '',
      addressLine: '',
      type: 'HOME',
      isDefault: false,
    });
  };
  const openCreateDialog = (): void => {
    setDialogMode('create');
    setEditingAddressId(null);
    reset({
      fullName: '',
      phoneNumber: '',
      cityId: '',
      districtId: '',
      wardId: '',
      addressLine: '',
      type: 'HOME',
      isDefault: false,
    });
    setIsDialogOpen(true);
  };
  const openEditDialog = (address: CustomerAddress): void => {
    setDialogMode('edit');
    setEditingAddressId(address.id);
    reset({
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      cityId: String(address.city.id),
      districtId: String(address.district.id),
      wardId: String(address.ward.id),
      addressLine: address.addressLine,
      type: address.type,
      isDefault: address.isDefault,
    });
    setIsDialogOpen(true);
  };
  const closeDeleteDialog = (): void => {
    if (removeAddressMutation.isPending) {
      return;
    }
    setDeletingAddress(null);
  };
  const handleDeleteAddress = async (): Promise<void> => {
    if (!deletingAddress) {
      return;
    }
    await removeAddressMutation.mutateAsync(deletingAddress.id);
    setDeletingAddress(null);
  };
  const handleSubmitAddress = async (values: AddressFormValues): Promise<void> => {
    const payload = {
      fullName: values.fullName.trim().replace(/\s+/g, ' '),
      phoneNumber: values.phoneNumber.trim(),
      cityId: Number(values.cityId),
      districtId: Number(values.districtId),
      wardId: Number(values.wardId),
      addressLine: values.addressLine.trim(),
      type: values.type,
      isDefault: values.isDefault,
    };
    if (dialogMode === 'edit' && editingAddressId) {
      await updateAddressMutation.mutateAsync({
        id: editingAddressId,
        payload,
      });
      return;
    }
    await createAddressMutation.mutateAsync(payload);
  };
  if (addressListQuery.isLoading) {
    return (
      <main className="shop-shell-container pb-16 pt-8">
        <p className="text-sm text-muted-foreground">Đang tải sổ địa chỉ...</p>
      </main>
    );
  }
  if (addressListQuery.isError) {
    return (
      <main className="shop-shell-container pb-16 pt-8">
        <p className="text-sm text-destructive" role="alert">
          {addressListQuery.error instanceof Error
            ? addressListQuery.error.message
            : 'Không tải được sổ địa chỉ.'}
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
        <span className="mx-2">/</span>
        <Link href="/me/profile" className="hover:text-foreground">
          Tài khoản
        </Link>
        <span className="mx-2">/</span>
        <span>Sổ địa chỉ</span>
      </nav>
      <section className="mt-8 grid gap-8 md:grid-cols-[270px_minmax(0,1fr)] md:items-start">
        <aside className="radius-diagonal-lg self-start border border-border p-4">
          <div className="mb-3 border-b border-border pb-3 text-[20px] font-semibold text-foreground">
            Tài khoản
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[24px] leading-[30px] font-semibold uppercase text-foreground">
              Sổ địa chỉ
            </h1>
            <PrimaryCtaButton className="w-auto min-w-[156px]" onClick={openCreateDialog}>
              THÊM ĐỊA CHỈ
            </PrimaryCtaButton>
          </div>
          {addresses.length === 0 ? (
            <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-md bg-white px-4 text-sm text-muted-foreground">
              Bạn chưa có địa chỉ nào trong sổ địa chỉ.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {addresses.map((address) => (
                <article
                  key={address.id}
                  className="radius-diagonal-lg border border-border bg-white px-6 py-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[16px] leading-[24px] font-semibold text-foreground">
                          {address.fullName} (
                          {address.type === 'OFFICE' ? 'Cơ quan/công ty' : 'Nhà/chung cư'})
                        </p>
                        {address.isDefault ? (
                          <span className="inline-flex items-center rounded-sm border border-border bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[14px] leading-[20px] text-muted-foreground">
                        Điện thoại: {address.phoneNumber}
                      </p>
                      <p className="text-[14px] leading-[20px] text-muted-foreground">
                        Địa chỉ:{' '}
                        {[
                          address.addressLine,
                          address.ward.name,
                          address.district.name,
                          address.city.name,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        className="text-[16px] leading-[24px] text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => openEditDialog(address)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="text-[16px] leading-[24px] text-muted-foreground transition-colors hover:text-destructive"
                        disabled={removeAddressMutation.isPending}
                        onClick={() => setDeletingAddress(address)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <Dialog
        open={isDialogOpen}
        onOpenChange={(openValue: boolean) => {
          if (!openValue) {
            closeDialog();
            return;
          }
          setIsDialogOpen(true);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto max-w-[calc(100%-2rem)] sm:max-w-[1080px] rounded-none bg-white px-8 py-8 sm:px-12 sm:py-10 text-foreground ring-0"
        >
          <button
            type="button"
            className="absolute right-5 top-4 text-[#9B9B9B] transition-colors hover:text-foreground"
            aria-label="Đóng"
            onClick={closeDialog}
          >
            <XIcon className="size-6" />
          </button>
          <DialogTitle className="text-center text-[30px] leading-[52px] font-semibold uppercase tracking-wide">
            {dialogMode === 'create' ? 'Thêm địa chỉ' : 'Cập nhật địa chỉ'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Biểu mẫu thêm mới hoặc cập nhật địa chỉ giao hàng cho tài khoản khách hàng.
          </DialogDescription>
          <form
            onSubmit={handleSubmit(handleSubmitAddress)}
            className="mx-auto mt-8 w-full max-w-[820px] space-y-8"
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                label="Họ tên"
                name="fullName"
                placeholder="Nhập họ tên"
                disabled={isFormSubmitting}
                error={errors.fullName?.message}
                invalid={Boolean(errors.fullName)}
                {...omitRegisterName(fullNameRegistration)}
              />
              <LabeledInput
                label="Số điện thoại"
                name="phoneNumber"
                placeholder="Nhập số điện thoại"
                disabled={isFormSubmitting}
                error={errors.phoneNumber?.message}
                invalid={Boolean(errors.phoneNumber)}
                {...omitRegisterName(phoneNumberRegistration)}
              />
              <LabeledInputSelect
                label="Chọn Tỉnh/TP"
                name="cityId"
                value={cityId}
                options={cityOptions}
                placeholder={citiesQuery.isLoading ? 'Đang tải...' : 'Chọn Tỉnh/TP'}
                disabled={isFormSubmitting || citiesQuery.isLoading}
                onValueChange={(value: string) => {
                  setValue('cityId', value, { shouldDirty: true });
                  setValue('districtId', '', { shouldDirty: true });
                  setValue('wardId', '', { shouldDirty: true });
                  clearErrors(['cityId', 'districtId', 'wardId']);
                }}
                invalid={Boolean(errors.cityId)}
                error={errors.cityId?.message}
              />
              <LabeledInputSelect
                label="Quận/Huyện"
                name="districtId"
                value={districtId}
                options={districtOptions}
                placeholder={!cityId ? 'Chọn Tỉnh/TP trước' : 'Chọn Quận/Huyện'}
                disabled={isFormSubmitting || !cityId || districtsQuery.isLoading}
                onValueChange={(value: string) => {
                  setValue('districtId', value, { shouldDirty: true });
                  setValue('wardId', '', { shouldDirty: true });
                  clearErrors(['districtId', 'wardId']);
                }}
                invalid={Boolean(errors.districtId)}
                error={errors.districtId?.message}
              />
              <div className="md:col-span-2">
                <LabeledInputSelect
                  label="Phường xã"
                  name="wardId"
                  value={wardId}
                  options={wardOptions}
                  placeholder={!districtId ? 'Chọn Quận/Huyện trước' : 'Chọn Phường/Xã'}
                  disabled={isFormSubmitting || !districtId || wardsQuery.isLoading}
                  onValueChange={(value: string) =>
                    setValue('wardId', value, { shouldDirty: true })
                  }
                  invalid={Boolean(errors.wardId)}
                  error={errors.wardId?.message}
                />
              </div>
              <div className="md:col-span-2">
                <LabeledInput
                  label="Địa chỉ"
                  name="addressLine"
                  placeholder="Nhập địa chỉ"
                  disabled={isFormSubmitting}
                  error={errors.addressLine?.message}
                  invalid={Boolean(errors.addressLine)}
                  {...omitRegisterName(addressLineRegistration)}
                />
              </div>
            </div>
            <LabeledRadioGroup<'HOME' | 'OFFICE'>
              label="Loại địa chỉ"
              value={selectedAddressType}
              options={[
                { value: 'HOME', label: 'Nhà/chung cư' },
                { value: 'OFFICE', label: 'Cơ quan/công ty' },
              ]}
              onValueChange={(value) =>
                setValue('type', value, { shouldValidate: true, shouldDirty: true })
              }
              disabled={isFormSubmitting}
              invalid={Boolean(errors.type)}
              error={errors.type?.message}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-default-address"
                checked={isDefaultAddress}
                onCheckedChange={(checked) =>
                  setValue('isDefault', checked === true, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={isFormSubmitting}
              />
              <label htmlFor="is-default-address" className="text-sm text-muted-foreground">
                Đặt làm mặc định
              </label>
            </div>
            <PrimaryCtaButton type="submit" disabled={isFormSubmitting}>
              {isFormSubmitting
                ? 'ĐANG XỬ LÝ...'
                : dialogMode === 'create'
                  ? 'THÊM ĐỊA CHỈ'
                  : 'CẬP NHẬT ĐỊA CHỈ'}
            </PrimaryCtaButton>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deletingAddress)}
        onOpenChange={(isOpen: boolean) => !isOpen && closeDeleteDialog()}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[760px] rounded-none border border-border bg-white px-8 py-8 sm:px-12 sm:py-10 text-foreground ring-0">
          <AlertDialogHeader className="space-y-3 text-center">
            <AlertDialogTitle className="text-[30px] leading-[52px] font-semibold uppercase tracking-wide">
              Xóa địa chỉ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-[24px] text-[#57585A]">
              Bạn có chắc chắn muốn xóa địa chỉ của{' '}
              <span className="font-semibold text-foreground">{deletingAddress?.fullName}</span>?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mx-0 mb-0 mt-8 grid border-0 bg-transparent p-0 md:grid-cols-2 md:gap-4">
            <PrimaryCtaButton
              ctaVariant="outline"
              disabled={removeAddressMutation.isPending}
              onClick={closeDeleteDialog}
            >
              Hủy
            </PrimaryCtaButton>
            <PrimaryCtaButton
              disabled={removeAddressMutation.isPending}
              onClick={handleDeleteAddress}
            >
              {removeAddressMutation.isPending ? 'ĐANG XÓA...' : 'XÓA ĐỊA CHỈ'}
            </PrimaryCtaButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
