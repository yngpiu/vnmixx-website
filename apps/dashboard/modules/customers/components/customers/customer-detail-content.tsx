'use client';

import { employeeAvatarDisplayUrl, initialsFromFullName } from '@/modules/common/utils/avatar';
import { getCustomer } from '@/modules/customers/api/customers';
import type {
  CustomerDetail,
  CustomerGender,
  CustomerStatus,
} from '@/modules/customers/types/customer';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const dateOnlyFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });

function genderLabel(gender: CustomerGender | null): string {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  if (gender === 'OTHER') return 'Khác';
  return '—';
}

function statusBadge(status: CustomerStatus): ReactNode {
  if (status === 'ACTIVE') {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
      >
        Đang hoạt động
      </Badge>
    );
  }
  if (status === 'PENDING_VERIFICATION') {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900/80"
      >
        Chờ xác minh
      </Badge>
    );
  }
  return (
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
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-foreground text-sm leading-snug">{children}</dd>
    </div>
  );
}

type CustomerDetailContentProps = {
  customerId: number;
};

export function CustomerDetailContent({ customerId }: CustomerDetailContentProps) {
  const detailQuery = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => getCustomer(customerId),
  });
  const customer: CustomerDetail | undefined = detailQuery.data;
  const avatarSrc = customer ? employeeAvatarDisplayUrl(customer.avatarUrl) : undefined;
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      {detailQuery.isLoading ? (
        <p className="px-6 py-6 text-center text-sm text-muted-foreground">Đang tải…</p>
      ) : null}
      {detailQuery.isError ? (
        <p className="text-destructive px-6 py-6 text-center text-sm" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Không tải được khách hàng.'}
        </p>
      ) : null}
      {customer ? (
        <div className="flex flex-col gap-5 px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-16 shrink-0">
              <AvatarImage src={avatarSrc} alt="" />
              <AvatarFallback className="text-sm font-medium">
                {initialsFromFullName(customer.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-foreground text-sm font-medium">{customer.fullName}</p>
              <p className="text-muted-foreground text-sm break-all">{customer.email}</p>
            </div>
          </div>
          <dl className="flex flex-col gap-5">
            <DetailRow label="Trạng thái">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(customer.status)}
                {customer.deletedAt ? <Badge variant="destructive">Đã xóa</Badge> : null}
              </div>
            </DetailRow>
            <DetailRow label="Điện thoại">
              <span className="block tabular-nums">{customer.phoneNumber}</span>
            </DetailRow>
            <DetailRow label="Giới tính">
              <span className="block">{genderLabel(customer.gender)}</span>
            </DetailRow>
            <DetailRow label="Ngày sinh">
              <span className="tabular-nums">
                {customer.dob ? dateOnlyFormatter.format(new Date(customer.dob)) : '—'}
              </span>
            </DetailRow>
            <DetailRow label="Xác minh email">
              <span className="tabular-nums">
                {customer.emailVerifiedAt
                  ? dateTimeFormatter.format(new Date(customer.emailVerifiedAt))
                  : 'Chưa xác minh'}
              </span>
            </DetailRow>
            <DetailRow label="Địa chỉ đã lưu">
              <span>{customer._count.addresses}</span>
            </DetailRow>
          </dl>
          <Separator />
          <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <p className="text-muted-foreground">
              Tạo lúc:{' '}
              <span className="text-foreground tabular-nums">
                {dateTimeFormatter.format(new Date(customer.createdAt))}
              </span>
            </p>
            <p className="text-muted-foreground">
              Cập nhật:{' '}
              <span className="text-foreground tabular-nums">
                {dateTimeFormatter.format(new Date(customer.updatedAt))}
              </span>
            </p>
            {customer.deletedAt ? (
              <p className="text-muted-foreground sm:col-span-2">
                Xóa lúc:{' '}
                <span className="text-foreground tabular-nums">
                  {dateTimeFormatter.format(new Date(customer.deletedAt))}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
