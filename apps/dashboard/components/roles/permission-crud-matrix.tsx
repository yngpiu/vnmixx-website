'use client';

import {
  CRUD_ACTIONS,
  CRUD_LABELS,
  type CrudAction,
  type CrudMatrixRow,
  buildCrudMatrix,
  permissionIdsForColumn,
  permissionIdsForRow,
} from '@/lib/rbac-matrix';
import type { Permission } from '@/lib/types/rbac';
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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-48 ps-3">
                <span className="text-foreground">Tài nguyên</span>
              </TableHead>
              {CRUD_ACTIONS.map((action) => {
                const { all, some } = columnState(rows, action, assignedIds);
                return (
                  <TableHead key={action} className="w-24 text-center">
                    <div className="flex flex-col items-center gap-1.5 py-0.5">
                      <Checkbox
                        disabled={disabled || permissionIdsForColumn(rows, action).length === 0}
                        checked={some && !all ? 'indeterminate' : all}
                        onCheckedChange={(v) => setColumn(action, v === true)}
                        aria-label={`Chọn tất cả quyền ${CRUD_LABELS[action]}`}
                      />
                      <span className="text-foreground text-xs font-medium">
                        {CRUD_LABELS[action]}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rs = rowState(row, assignedIds);
              return (
                <TableRow key={row.resource}>
                  <TableCell className="ps-3">
                    <div className="flex items-center gap-2">
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
                        <TableCell key={action} className="text-center">
                          <span className="text-muted-foreground text-xs">—</span>
                        </TableCell>
                      );
                    }
                    const checked = assignedIds.has(p.id);
                    return (
                      <TableCell key={action} className="text-center">
                        <div className="flex justify-center">
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
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Quyền khác (không theo CRUD)</p>
          <ul className="flex flex-col gap-2">
            {other.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Checkbox
                  disabled={disabled}
                  checked={assignedIds.has(p.id)}
                  onCheckedChange={(v) => onAssignedChange(p.id, v === true)}
                  id={`perm-other-${p.id}`}
                />
                <Label
                  htmlFor={`perm-other-${p.id}`}
                  className={cn(
                    'text-sm font-normal',
                    disabled ? 'cursor-default' : 'cursor-pointer',
                  )}
                >
                  <code className="text-xs">{p.name}</code>
                  {p.description ? (
                    <span className="text-muted-foreground block text-xs">{p.description}</span>
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
