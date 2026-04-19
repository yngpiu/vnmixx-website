'use client';

import type { AuditLogItem } from '@/modules/audit-logs/types/audit-log';
import {
  auditLogActionDisplayName,
  getAuditLogActionBadgeStyles,
} from '@/modules/audit-logs/utils/audit-log-action-label';
import {
  DataTableColumnHeader,
  dataTableSttColumnDef,
} from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { LongText } from '@/modules/common/components/long-text';
import { permissionModuleDisplayName } from '@/modules/rbac/utils/permission-label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Hai dòng: dòng 1 đậm, dòng 2 muted — dùng chung cột thời gian & người thao tác. */
const auditLogTwoLineStack = 'tabular-nums leading-tight min-w-0';
const auditLogTwoLinePrimary = 'truncate  text-foreground';
const auditLogTwoLineSecondary = 'mt-0.5 truncate text-muted-foreground';

/** dd.mm.yyyy và hh:mm:ss (giờ địa phương). */
function auditLogCreatedAtParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return { date, time };
}

function buildActorLabel(item: AuditLogItem): string {
  if (!item.actorEmployee) {
    return 'Hệ thống';
  }
  return `${item.actorEmployee.fullName} (#${item.actorEmployee.id})`;
}

export type AuditLogsColumnsOptions = {
  onOpenActorEmployeeDetail?: (employeeId: number) => void;
};

export function createAuditLogsColumns(
  options: AuditLogsColumnsOptions = {},
): ColumnDef<AuditLogItem>[] {
  const { onOpenActorEmployeeDetail } = options;
  return [
    dataTableSttColumnDef<AuditLogItem>(),
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
      cell: ({ row }) => {
        const { date, time } = auditLogCreatedAtParts(row.original.createdAt);
        return (
          <div className={auditLogTwoLineStack}>
            <div className={auditLogTwoLinePrimary}>{date}</div>
            <div className={auditLogTwoLineSecondary}>{time}</div>
          </div>
        );
      },
      meta: { dataTableColumnLabel: 'Thời gian' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'action',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hành động" />,
      cell: ({ row }) => {
        const code = row.original.action;
        const { variant, className: actionBadgeClass } = getAuditLogActionBadgeStyles(code);
        return (
          <LongText className="max-w-52 md:max-w-64">
            <Badge variant={variant} title={code} className={actionBadgeClass}>
              <span className="min-w-0 truncate font-medium">
                {auditLogActionDisplayName(code)}
              </span>
            </Badge>
          </LongText>
        );
      },
      filterFn: (row, _id, value) => {
        const selected = (value as string[]) ?? [];
        if (selected.length === 0) return true;
        return selected.includes(row.original.action);
      },
      meta: { dataTableColumnLabel: 'Hành động' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'resourceType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tài nguyên" />,
      cell: ({ row }) => {
        const key = row.original.resourceType;
        const labelVi = permissionModuleDisplayName(key);
        const idPart = row.original.resourceId != null ? `#${row.original.resourceId}` : '—';
        return (
          <Badge
            variant="outline"
            title={key}
            className="inline-flex h-auto max-w-full min-w-0 items-center gap-1.5 py-1 font-normal"
          >
            <span className="min-w-0 truncate font-medium">{labelVi}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{idPart}</span>
          </Badge>
        );
      },
      filterFn: (row, _id, value) => {
        const selected = (value as string[]) ?? [];
        if (selected.length === 0) return true;
        return selected.includes(row.original.resourceType);
      },
      meta: { dataTableColumnLabel: 'Tài nguyên' } satisfies DataTableColumnMeta,
    },
    {
      id: 'actorEmployee',
      accessorFn: buildActorLabel,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Người thao tác" />,
      cell: ({ row }) => {
        const actor = row.original.actorEmployee;
        if (!actor) {
          return (
            <LongText className="max-w-44 md:max-w-56">
              <div className={auditLogTwoLineStack}>
                <div className={auditLogTwoLinePrimary}>Hệ thống</div>
              </div>
            </LongText>
          );
        }
        const nameBlock = onOpenActorEmployeeDetail ? (
          <button
            type="button"
            className={cn(
              auditLogTwoLinePrimary,
              'block w-full cursor-pointer border-0 bg-transparent p-0 text-left no-underline transition-colors hover:!text-primary',
            )}
            onClick={(event) => {
              event.stopPropagation();
              onOpenActorEmployeeDetail(actor.id);
            }}
          >
            {actor.fullName}
          </button>
        ) : (
          <div className={auditLogTwoLinePrimary}>{actor.fullName}</div>
        );
        return (
          <LongText className="max-w-44 md:max-w-56">
            <div className={auditLogTwoLineStack}>
              {nameBlock}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(auditLogTwoLineSecondary, 'cursor-default no-underline')}>
                    {actor.email}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="break-all">{actor.email}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </LongText>
        );
      },
      filterFn: (row, _id, value) => {
        const selected = (value as string[]) ?? [];
        if (selected.length === 0) return true;
        const id = row.original.actorEmployee?.id;
        return id !== undefined && selected.includes(String(id));
      },
      meta: { dataTableColumnLabel: 'Người thao tác' } satisfies DataTableColumnMeta,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
      cell: ({ row }) =>
        row.original.status === 'SUCCESS' ? (
          <Badge
            variant="secondary"
            className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
          >
            Thành công
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
          >
            Thất bại
          </Badge>
        ),
      filterFn: (row, _id, value) => {
        const selected = (value as string[]) ?? [];
        if (selected.length === 0 || selected.length >= 2) return true;
        return selected[0] === row.original.status;
      },
      meta: { dataTableColumnLabel: 'Trạng thái' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'errorMessage',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lỗi" />,
      cell: ({ row }) => (
        <LongText
          className={cn('max-w-60 text-xs', row.original.status === 'FAILED' && 'text-red-600')}
        >
          {row.original.errorMessage ?? '—'}
        </LongText>
      ),
      meta: { dataTableColumnLabel: 'Lỗi' } satisfies DataTableColumnMeta,
      enableSorting: false,
    },
  ];
}

/** Default columns (actor name is plain text — no detail dialog). */
export const auditLogsColumns: ColumnDef<AuditLogItem>[] = createAuditLogsColumns();
