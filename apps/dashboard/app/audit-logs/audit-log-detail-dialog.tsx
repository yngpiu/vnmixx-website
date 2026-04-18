'use client';

import { JsonHighlightedBlock } from '@/components/json-highlighted-block';
import { adminModuleDetailPath } from '@/lib/admin-modules';
import { auditLogActionDisplayName } from '@/lib/audit-log-action-label';
import { collectAuditJsonDiff } from '@/lib/audit-log-json-diff';
import { permissionModuleDisplayName } from '@/lib/permission-label';
import type { AuditLogItem } from '@/lib/types/audit-log';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type AuditLogDetailTab = 'info' | 'data';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function formatJsonBlock(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDiffCell(value: unknown): string {
  if (value === undefined) {
    return '—';
  }
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type DataViewMode = 'diff' | 'full';

const diffKindLabel: Record<'added' | 'removed' | 'changed', string> = {
  added: 'Thêm',
  removed: 'Xóa',
  changed: 'Đổi',
};

const diffKindBadgeClass: Record<'added' | 'removed' | 'changed', string> = {
  added:
    'border-transparent bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900/80',
  removed:
    'border-transparent bg-red-50 text-red-900 hover:bg-red-100 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900/80',
  changed:
    'border-transparent bg-amber-50 text-amber-950 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900/80',
};

function MetaItem({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <div className="text-foreground text-sm leading-snug break-words">{children}</div>
    </div>
  );
}

type AuditLogDetailDialogProps = {
  item: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Chi tiết nhật ký thao tác: metadata và snapshot trước/sau (để tra cứu). */
export function AuditLogDetailDialog({ item, open, onOpenChange }: AuditLogDetailDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuditLogDetailTab>('info');
  const [dataView, setDataView] = useState<DataViewMode>('diff');

  const dataDiffEntries = useMemo(() => {
    if (!item) {
      return [];
    }
    return collectAuditJsonDiff(item.beforeData, item.afterData);
  }, [item]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTab('info');
    setDataView('diff');
  }, [open, item?.id]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          'flex max-h-[min(92dvh,48rem)] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl',
        )}
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle>
              {item ? `Nhật ký thao tác #${item.id}` : 'Chi tiết nhật ký thao tác'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Bản chụp tại thời điểm ghi log để đối soát. Hệ thống không tự ghi đè bản ghi gốc —
              chỉnh sửa thực tế thực hiện trên màn hình quản trị tương ứng.
            </DialogDescription>
          </DialogHeader>
        </div>

        {item ? (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as AuditLogDetailTab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 px-6 pt-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="info" className="flex-1 sm:flex-none">
                  Thông tin
                </TabsTrigger>
                <TabsTrigger value="data" className="flex-1 sm:flex-none">
                  Dữ liệu
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="info"
              className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
            >
              <div className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
                <MetaItem label="Thời gian">
                  <span className="tabular-nums">
                    {dateTimeFormatter.format(new Date(item.createdAt))}
                  </span>
                </MetaItem>
                <MetaItem label="Trạng thái">
                  {item.status === 'SUCCESS' ? (
                    <Badge
                      variant="secondary"
                      className="border-transparent bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900/80"
                    >
                      Thành công
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="border-transparent bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/80"
                    >
                      Thất bại
                    </Badge>
                  )}
                </MetaItem>
                <MetaItem label="Hành động">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-foreground text-sm font-medium leading-snug">
                      {auditLogActionDisplayName(item.action)}
                    </span>
                    <code
                      className="bg-muted text-muted-foreground w-fit max-w-full rounded-md px-1.5 py-0.5 font-mono text-[0.65rem] leading-normal break-all"
                      title={item.action}
                    >
                      {item.action}
                    </code>
                  </div>
                </MetaItem>
                <MetaItem label="Tài nguyên">
                  <span className="font-medium" title={item.resourceType}>
                    {permissionModuleDisplayName(item.resourceType)}
                  </span>
                  {item.resourceId != null ? (
                    <span className="text-muted-foreground"> · #{item.resourceId}</span>
                  ) : null}
                </MetaItem>
                <MetaItem label="Người thao tác" className="sm:col-span-2">
                  {item.actorEmployee ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-1">
                      <button
                        type="button"
                        className="text-primary hover:text-primary/90 text-left font-medium underline-offset-4 hover:underline"
                        onClick={() => {
                          const actor = item.actorEmployee;
                          if (!actor) {
                            return;
                          }
                          onOpenChange(false);
                          router.push(adminModuleDetailPath('employees', actor.id));
                        }}
                      >
                        {item.actorEmployee.fullName}
                      </button>
                      <span className="text-muted-foreground">· {item.actorEmployee.email}</span>
                    </span>
                  ) : (
                    'Hệ thống'
                  )}
                </MetaItem>
                <MetaItem label="Request ID">
                  <code className="break-all font-mono text-xs">{item.requestId ?? '—'}</code>
                </MetaItem>
                <MetaItem label="IP">
                  <code className="font-mono text-xs">{item.ipAddress ?? '—'}</code>
                </MetaItem>
                {item.userAgent ? (
                  <MetaItem label="User-Agent" className="sm:col-span-2">
                    <span className="text-muted-foreground font-mono text-xs break-all">
                      {item.userAgent}
                    </span>
                  </MetaItem>
                ) : null}
                {item.errorMessage ? (
                  <MetaItem label="Lỗi" className="sm:col-span-2">
                    <span className="text-destructive text-sm">{item.errorMessage}</span>
                  </MetaItem>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent
              value="data"
              className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 py-4"
            >
              <Tabs
                value={dataView}
                onValueChange={(value) => setDataView(value as DataViewMode)}
                className="flex min-h-0 flex-1 flex-col gap-3"
              >
                <TabsList className="h-9 w-fit shrink-0 self-start">
                  <TabsTrigger value="diff" className="flex-none px-3">
                    Khác biệt
                  </TabsTrigger>
                  <TabsTrigger value="full" className="flex-none px-3">
                    Đầy đủ (JSON)
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="diff"
                  forceMount
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                >
                  {dataDiffEntries.length === 0 ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Không có khác biệt giữa hai bản chụp, hoặc dữ liệu trước/sau trống và giống
                      nhau.
                    </p>
                  ) : (
                    <div className="bg-card flex min-h-0 flex-1 flex-col rounded-xl border shadow-sm">
                      <div className="text-muted-foreground shrink-0 rounded-t-xl border-b bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wide">
                        {dataDiffEntries.length} thay đổi theo đường dẫn field
                      </div>
                      <div className="max-h-[min(52vh,28rem)] min-h-40 flex-1 overflow-auto rounded-b-xl">
                        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                          <thead className="bg-muted/40 sticky top-0 z-[1] backdrop-blur-sm">
                            <tr className="border-b">
                              <th className="text-muted-foreground w-[28%] px-3 py-2.5 font-semibold">
                                Đường dẫn
                              </th>
                              <th className="text-muted-foreground w-[10%] px-3 py-2.5 font-semibold">
                                Loại
                              </th>
                              <th className="text-muted-foreground w-[31%] px-3 py-2.5 font-semibold">
                                Trước
                              </th>
                              <th className="text-muted-foreground w-[31%] px-3 py-2.5 font-semibold">
                                Sau
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataDiffEntries.map((row, rowIndex) => {
                              const beforeText = formatDiffCell(row.before);
                              const afterText = formatDiffCell(row.after);
                              return (
                                <tr
                                  key={`${row.path}:${row.kind}:${rowIndex}`}
                                  className="border-border/80 border-b last:border-b-0"
                                >
                                  <td className="text-foreground align-top px-3 py-2 font-mono break-all">
                                    {row.path}
                                  </td>
                                  <td className="align-top px-3 py-2">
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        'font-normal tabular-nums',
                                        diffKindBadgeClass[row.kind],
                                      )}
                                    >
                                      {diffKindLabel[row.kind]}
                                    </Badge>
                                  </td>
                                  <td className="text-foreground align-top px-3 py-2">
                                    <code
                                      className="block max-h-32 overflow-y-auto break-all font-mono text-[0.7rem] leading-snug whitespace-pre-wrap"
                                      title={beforeText}
                                    >
                                      {beforeText}
                                    </code>
                                  </td>
                                  <td className="text-foreground align-top px-3 py-2">
                                    <code
                                      className="block max-h-32 overflow-y-auto break-all font-mono text-[0.7rem] leading-snug whitespace-pre-wrap"
                                      title={afterText}
                                    >
                                      {afterText}
                                    </code>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="full"
                  forceMount
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto data-[state=inactive]:hidden"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-card flex min-h-0 flex-col rounded-xl border shadow-sm">
                      <div className="text-muted-foreground shrink-0 rounded-t-xl border-b bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
                        Trước thay đổi
                        <span className="text-muted-foreground/70 ms-1 font-normal normal-case">
                          (beforeData)
                        </span>
                      </div>
                      <div className="text-foreground max-h-[min(48vh,24rem)] min-h-40 flex-1 overflow-auto rounded-b-xl p-4">
                        <JsonHighlightedBlock code={formatJsonBlock(item.beforeData)} />
                      </div>
                    </div>
                    <div className="bg-card flex min-h-0 flex-col rounded-xl border shadow-sm">
                      <div className="text-muted-foreground shrink-0 rounded-t-xl border-b bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
                        Sau thay đổi
                        <span className="text-muted-foreground/70 ms-1 font-normal normal-case">
                          (afterData)
                        </span>
                      </div>
                      <div className="text-foreground max-h-[min(48vh,24rem)] min-h-40 flex-1 overflow-auto rounded-b-xl p-4">
                        <JsonHighlightedBlock code={formatJsonBlock(item.afterData)} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
