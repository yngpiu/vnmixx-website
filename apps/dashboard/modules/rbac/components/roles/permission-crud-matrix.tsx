'use client';

import {
  CRUD_ACTIONS,
  CRUD_LABELS,
  type CrudAction,
  type CrudMatrixRow,
  buildCrudMatrix,
  permissionIdsForColumn,
  permissionIdsForRow,
} from '@/modules/rbac/rbac-matrix';
import type { Permission } from '@/modules/rbac/types/rbac';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Label } from '@repo/ui/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { useMemo } from 'react';

type PermissionCrudMatrixProps = {
  permissions: Permission[];
  assignedIds: Set<number>;
  onAssignedChange: (id: number, assigned: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function columnState(
  rows: CrudMatrixRow[],
  action: CrudAction,
  assignedIds: Set<number>,
): { all: boolean; some: boolean } {
  const ids = permissionIdsForColumn(rows, action);
  if (ids.length === 0) return { all: false, some: false };
  const n = ids.filter((id) => assignedIds.has(id)).length;
  return { all: n === ids.length, some: n > 0 && n < ids.length };
}

function rowState(row: CrudMatrixRow, assignedIds: Set<number>): { all: boolean; some: boolean } {
  const ids = permissionIdsForRow(row);
  if (ids.length === 0) return { all: false, some: false };
  const n = ids.filter((id) => assignedIds.has(id)).length;
  return { all: n === ids.length, some: n > 0 && n < ids.length };
}

export function PermissionCrudMatrix({
  permissions,
  assignedIds,
  onAssignedChange,
  disabled,
  className,
}: PermissionCrudMatrixProps) {
  const { rows, other } = useMemo(() => buildCrudMatrix(permissions), [permissions]);

  const setColumn = (action: CrudAction, checked: boolean) => {
    const ids = permissionIdsForColumn(rows, action);
    for (const id of ids) onAssignedChange(id, checked);
  };

  const setRow = (row: CrudMatrixRow, checked: boolean) => {
    for (const id of permissionIdsForRow(row)) onAssignedChange(id, checked);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="bg-muted/60 text-foreground w-48 min-w-48 ps-3 align-bottom">
                Tài nguyên
              </TableHead>
              {CRUD_ACTIONS.map((action) => {
                const { all, some } = columnState(rows, action, assignedIds);
                return (
                  <TableHead
                    key={action}
                    className="bg-muted/60 w-24 min-w-22 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <Checkbox
                        disabled={disabled || permissionIdsForColumn(rows, action).length === 0}
                        checked={some && !all ? 'indeterminate' : all}
                        onCheckedChange={(v) => setColumn(action, v === true)}
                        aria-label={`Chọn tất cả quyền ${CRUD_LABELS[action]}`}
                      />
                      <span className="text-foreground text-[11px] font-semibold uppercase tracking-wide">
                        {CRUD_LABELS[action]}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const rs = rowState(row, assignedIds);
              return (
                <TableRow
                  key={row.resource}
                  className={cn(
                    'border-border/60 hover:bg-muted/25 border-b last:border-b-0',
                    index % 2 === 1 && 'bg-muted/15',
                  )}
                >
                  <TableCell className="ps-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        disabled={disabled || permissionIdsForRow(row).length === 0}
                        checked={rs.some && !rs.all ? 'indeterminate' : rs.all}
                        onCheckedChange={(v) => setRow(row, v === true)}
                        aria-label={`Chọn tất cả quyền cho ${row.label}`}
                      />
                      <span className="text-sm font-medium">{row.label}</span>
                    </div>
                  </TableCell>
                  {CRUD_ACTIONS.map((action) => {
                    const p = row.byAction[action];
                    if (!p) {
                      return (
                        <TableCell key={action} className="text-center align-middle">
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        </TableCell>
                      );
                    }
                    const checked = assignedIds.has(p.id);
                    return (
                      <TableCell key={action} className="text-center align-middle">
                        <div className="flex justify-center py-0.5">
                          <Checkbox
                            disabled={disabled}
                            checked={checked}
                            onCheckedChange={(v) => onAssignedChange(p.id, v === true)}
                            aria-label={`${row.label} — ${CRUD_LABELS[action]} (${p.name})`}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {other.length > 0 ? (
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-muted/50 border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Quyền bổ sung</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Không gói trong Tạo / Xem / Sửa / Xóa — tick từng dòng nếu cần.
            </p>
          </div>
          <ul className="divide-border/80 flex flex-col divide-y">
            {other.map((p) => (
              <li key={p.id} className="hover:bg-muted/20 flex items-start gap-3 px-4 py-3">
                <Checkbox
                  disabled={disabled}
                  checked={assignedIds.has(p.id)}
                  onCheckedChange={(v) => onAssignedChange(p.id, v === true)}
                  id={`perm-other-${p.id}`}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`perm-other-${p.id}`}
                  className={cn(
                    'min-w-0 flex-1 font-normal',
                    disabled ? 'cursor-default' : 'cursor-pointer',
                  )}
                >
                  <code className="text-foreground bg-muted/70 rounded px-1.5 py-0.5 font-mono text-xs">
                    {p.name}
                  </code>
                  {p.description ? (
                    <span className="text-muted-foreground mt-1 block text-xs leading-snug">
                      {p.description}
                    </span>
                  ) : null}
                </Label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
