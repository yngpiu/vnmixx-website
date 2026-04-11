import type { Permission } from '@/lib/types/rbac';

export const CRUD_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export const CRUD_LABELS: Record<CrudAction, string> = {
  create: 'Tạo',
  read: 'Xem',
  update: 'Sửa',
  delete: 'Xóa',
};

const RESOURCE_LABELS: Record<string, string> = {
  rbac: 'Phân quyền',
  order: 'Đơn hàng',
  customer: 'Khách hàng',
  employee: 'Nhân viên',
  product: 'Sản phẩm',
  category: 'Danh mục',
  color: 'Màu sắc',
  size: 'Kích cỡ',
  attribute: 'Thuộc tính',
};

export function resourceDisplayLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

export type CrudMatrixRow = {
  resource: string;
  label: string;
  byAction: Record<CrudAction, Permission | null>;
};

export function buildCrudMatrix(permissions: Permission[]): {
  rows: CrudMatrixRow[];
  other: Permission[];
} {
  const map = new Map<string, Partial<Record<CrudAction, Permission>>>();
  const other: Permission[] = [];

  for (const p of permissions) {
    const dot = p.name.lastIndexOf('.');
    if (dot <= 0) {
      other.push(p);
      continue;
    }
    const resource = p.name.slice(0, dot);
    const action = p.name.slice(dot + 1);
    if (!CRUD_ACTIONS.includes(action as CrudAction)) {
      other.push(p);
      continue;
    }
    const a = action as CrudAction;
    if (!map.has(resource)) map.set(resource, {});
    map.get(resource)![a] = p;
  }

  const rows: CrudMatrixRow[] = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, partial]) => ({
      resource,
      label: resourceDisplayLabel(resource),
      byAction: {
        create: partial.create ?? null,
        read: partial.read ?? null,
        update: partial.update ?? null,
        delete: partial.delete ?? null,
      },
    }));

  return { rows, other };
}

export function permissionIdsForColumn(rows: CrudMatrixRow[], action: CrudAction): number[] {
  const ids: number[] = [];
  for (const row of rows) {
    const p = row.byAction[action];
    if (p) ids.push(p.id);
  }
  return ids;
}

export function permissionIdsForRow(row: CrudMatrixRow): number[] {
  const ids: number[] = [];
  for (const a of CRUD_ACTIONS) {
    const p = row.byAction[a];
    if (p) ids.push(p.id);
  }
  return ids;
}
