'use client';

import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { LongText } from '@/components/long-text';
import { auditLogActionDisplayName } from '@/lib/audit-log-action-label';
import { permissionModuleDisplayName } from '@/lib/permission-label';
import type { AuditLogItem } from '@/lib/types/audit-log';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

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
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {dateTimeFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
      meta: { dataTableColumnLabel: 'Thời gian' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'action',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hành động" />,
      cell: ({ row }) => {
        const code = row.original.action;
        return (
          <LongText className="max-w-52 font-medium md:max-w-64">
            <span title={code}>{auditLogActionDisplayName(code)}</span>
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
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" title={key}>
              {labelVi}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {row.original.resourceId != null ? `#${row.original.resourceId}` : '—'}
            </span>
          </div>
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
            <LongText className="max-w-44 text-muted-foreground md:max-w-56">Hệ thống</LongText>
          );
        }
        if (!onOpenActorEmployeeDetail) {
          return (
            <LongText className="max-w-44 text-muted-foreground md:max-w-56">
              {buildActorLabel(row.original)}
            </LongText>
          );
        }
        return (
          <LongText className="max-w-44 md:max-w-56">
            <span className="inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1">
              <button
                type="button"
                className={cn(
                  'text-primary hover:text-primary/90 max-w-[min(100%,14rem)] min-w-0 shrink truncate text-left font-medium underline-offset-4 hover:underline',
                )}
                title={actor.email}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenActorEmployeeDetail(actor.id);
                }}
              >
                {actor.fullName}
              </button>
              <span className="shrink-0 text-muted-foreground">(#{actor.id})</span>
            </span>
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
