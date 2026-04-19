'use client';

import { getEmployee } from '@/lib/api/employees';
import type { EmployeeDetail } from '@/types/employee';
import { employeeAvatarDisplayUrl, initialsFromFullName } from '@/utils/avatar';
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

function roleLabel(role: { name: string } | null): string {
  return role?.name ?? '—';
}

function statusBadge(status: 'ACTIVE' | 'INACTIVE') {
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

type EmployeeDetailContentProps = {
  employeeId: number;
};

/**
 * Chi tiết một nhân viên (đọc API); dùng trên trang chi tiết, không bọc dialog.
 */
export function EmployeeDetailContent({ employeeId }: EmployeeDetailContentProps) {
  const detailQuery = useQuery({
    queryKey: ['employees', 'detail', employeeId],
    queryFn: () => getEmployee(employeeId),
  });
  const d: EmployeeDetail | undefined = detailQuery.data;
  const avatarSrc = d ? employeeAvatarDisplayUrl(d.avatarUrl, d.email) : '';
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      {detailQuery.isLoading ? (
        <p className="px-6 py-6 text-center text-sm text-muted-foreground">Đang tải…</p>
      ) : null}
      {detailQuery.isError ? (
        <p className="text-destructive px-6 py-6 text-center text-sm" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Không tải được nhân viên.'}
        </p>
      ) : null}
      {d ? (
        <div className="flex flex-col gap-5 px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-16 shrink-0">
              <AvatarImage src={avatarSrc} alt="" />
              <AvatarFallback className="text-sm font-medium">
                {initialsFromFullName(d.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-foreground text-sm font-medium">{d.fullName}</p>
              <p className="text-muted-foreground text-sm break-all">{d.email}</p>
            </div>
          </div>
          <dl className="flex flex-col gap-5">
            <DetailRow label="Trạng thái">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(d.status)}
                {d.deletedAt ? <Badge variant="destructive">Đã xóa</Badge> : null}
              </div>
            </DetailRow>
            <DetailRow label="Điện thoại">
              <span className="block tabular-nums">{d.phoneNumber}</span>
            </DetailRow>
            <DetailRow label="Vai trò">
              <span className="block">{roleLabel(d.role)}</span>
            </DetailRow>
          </dl>
          <Separator />
          <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <p className="text-muted-foreground">
              Tạo lúc:{' '}
              <span className="text-foreground tabular-nums">
                {dateTimeFormatter.format(new Date(d.createdAt))}
              </span>
            </p>
            <p className="text-muted-foreground">
              Cập nhật:{' '}
              <span className="text-foreground tabular-nums">
                {dateTimeFormatter.format(new Date(d.updatedAt))}
              </span>
            </p>
            {d.deletedAt ? (
              <p className="text-muted-foreground sm:col-span-2">
                Xóa lúc:{' '}
                <span className="text-foreground tabular-nums">
                  {dateTimeFormatter.format(new Date(d.deletedAt))}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
