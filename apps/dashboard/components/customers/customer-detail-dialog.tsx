'use client';

import { getCustomer } from '@/lib/api/customers';
import { employeeAvatarDisplayUrl, initialsFromFullName } from '@/lib/avatar';
import type { CustomerGender } from '@/lib/types/customer';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog';
import { Separator } from '@repo/ui/components/ui/separator';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const dateOnlyFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });

function genderLabel(g: CustomerGender | null): string {
  if (g === 'MALE') return 'Nam';
  if (g === 'FEMALE') return 'Nữ';
  if (g === 'OTHER') return 'Khác';
  return '—';
}

function statusBadge(isActive: boolean) {
  return isActive ? (
    <Badge
      variant="secondary"
      className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
    >
      Đang hoạt động
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
    >
      Vô hiệu hóa
    </Badge>
  );
}

function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[15px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

type CustomerDetailDialogProps = {
  customerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomerDetailDialog({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailDialogProps) {
  const detailQuery = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: open && customerId != null,
  });

  const d = detailQuery.data;
  const avatarSrc = d ? employeeAvatarDisplayUrl(d.avatarUrl, d.email) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[min(90dvh,44rem)] gap-0 overflow-y-auto p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="gap-1 text-center sm:text-center">
            <DialogTitle className="text-base font-medium text-muted-foreground">
              Chi tiết khách hàng
            </DialogTitle>
          </DialogHeader>
        </div>

        {detailQuery.isLoading && customerId != null ? (
          <p className="px-6 pb-6 text-center text-sm text-muted-foreground">Đang tải…</p>
        ) : null}

        {detailQuery.isError ? (
          <p className="text-destructive px-6 pb-6 text-center text-sm" role="alert">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Không tải được khách hàng.'}
          </p>
        ) : null}

        {d ? (
          <>
            <div className="flex flex-col items-center gap-3 px-6 pb-6 text-center">
              <Avatar className="size-28 ring-2 ring-border/80 ring-offset-2 ring-offset-background shadow-md">
                <AvatarImage src={avatarSrc} alt="" />
                <AvatarFallback className="text-xl font-medium">
                  {initialsFromFullName(d.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                  {d.fullName}
                </h2>
                <p className="text-sm text-muted-foreground">Mã #{d.id}</p>
              </div>
            </div>

            <Separator />

            <div className="px-6 pt-5 pb-6">
              <dl className="flex flex-col gap-5">
                <DetailRow label="Trạng thái">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(d.isActive)}
                    {d.deletedAt ? <Badge variant="destructive">Đã xóa</Badge> : null}
                  </div>
                </DetailRow>
                <DetailRow label="Email">
                  <span className="block font-medium break-all">{d.email}</span>
                </DetailRow>
                <DetailRow label="Điện thoại">
                  <span className="block font-medium tabular-nums">{d.phoneNumber}</span>
                </DetailRow>
                <DetailRow label="Giới tính">
                  <span className="block">{genderLabel(d.gender)}</span>
                </DetailRow>
                <DetailRow label="Ngày sinh">
                  <span className="tabular-nums">
                    {d.dob ? dateOnlyFormatter.format(new Date(d.dob)) : '—'}
                  </span>
                </DetailRow>
                <DetailRow label="Xác minh email">
                  <span className="tabular-nums">
                    {d.emailVerifiedAt
                      ? dateTimeFormatter.format(new Date(d.emailVerifiedAt))
                      : 'Chưa xác minh'}
                  </span>
                </DetailRow>
                <DetailRow label="Địa chỉ đã lưu">
                  <span>{d._count.addresses}</span>
                </DetailRow>
                <div className="grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2">
                  <DetailRow label="Tạo lúc">
                    <span className="tabular-nums">
                      {dateTimeFormatter.format(new Date(d.createdAt))}
                    </span>
                  </DetailRow>
                  <DetailRow label="Cập nhật">
                    <span className="tabular-nums">
                      {dateTimeFormatter.format(new Date(d.updatedAt))}
                    </span>
                  </DetailRow>
                </div>
                {d.deletedAt ? (
                  <DetailRow label="Xóa lúc" className="border-t border-border/60 pt-5">
                    <span className="tabular-nums text-amber-700 dark:text-amber-400">
                      {dateTimeFormatter.format(new Date(d.deletedAt))}
                    </span>
                  </DetailRow>
                ) : null}
              </dl>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
