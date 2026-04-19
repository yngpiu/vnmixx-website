import { permissionModuleDisplayName } from '@/utils/permission-label';

/** Known audit action codes (aligned with API services + seed). */
export const AUDIT_LOG_ACTION_VALUES = [
  'category.create',
  'category.delete',
  'category.restore',
  'category.update',
  'color.create',
  'color.delete',
  'color.update',
  'customer.delete',
  'customer.restore',
  'customer.update',
  'employee.create',
  'employee.delete',
  'employee.restore',
  'employee.update',
  'media.create-folder',
  'media.delete',
  'media.delete-folder',
  'media.move',
  'media.upload',
  'order.cancel',
  'order.confirm',
  'order.confirm-payment',
  'product.create',
  'product.delete',
  'product.image.create',
  'product.image.delete',
  'product.image.update',
  'product.restore',
  'product.update',
  'product.variant.create',
  'product.variant.delete',
  'product.variant.update',
  'profile.employee.update',
  'role.create',
  'role.delete',
  'role.update',
  'size.create',
  'size.delete',
  'size.update',
] as const;

const AUDIT_LOG_ACTION_LABELS_VI: Record<(typeof AUDIT_LOG_ACTION_VALUES)[number], string> = {
  'category.create': 'Thêm danh mục',
  'category.delete': 'Xóa danh mục',
  'category.restore': 'Khôi phục danh mục',
  'category.update': 'Sửa danh mục',
  'color.create': 'Thêm màu sắc',
  'color.delete': 'Xóa màu sắc',
  'color.update': 'Sửa màu sắc',
  'customer.delete': 'Xóa khách hàng',
  'customer.restore': 'Khôi phục khách hàng',
  'customer.update': 'Sửa khách hàng',
  'employee.create': 'Thêm nhân viên',
  'employee.delete': 'Xóa nhân viên',
  'employee.restore': 'Khôi phục nhân viên',
  'employee.update': 'Sửa nhân viên',
  'media.create-folder': 'Tạo thư mục',
  'media.delete': 'Xóa tệp tin',
  'media.delete-folder': 'Xóa thư mục',
  'media.move': 'Di chuyển tệp hoặc thư mục',
  'media.upload': 'Tải lên tệp tin',
  'order.cancel': 'Hủy đơn hàng',
  'order.confirm': 'Xác nhận đơn hàng',
  'order.confirm-payment': 'Xác nhận thanh toán đơn hàng',
  'product.create': 'Thêm sản phẩm',
  'product.delete': 'Xóa sản phẩm',
  'product.image.create': 'Thêm ảnh sản phẩm',
  'product.image.delete': 'Xóa ảnh sản phẩm',
  'product.image.update': 'Sửa ảnh sản phẩm',
  'product.restore': 'Khôi phục sản phẩm',
  'product.update': 'Sửa sản phẩm',
  'product.variant.create': 'Thêm biến thể sản phẩm',
  'product.variant.delete': 'Xóa biến thể sản phẩm',
  'product.variant.update': 'Sửa biến thể sản phẩm',
  'profile.employee.update': 'Sửa hồ sơ',
  'role.create': 'Thêm vai trò',
  'role.delete': 'Xóa vai trò',
  'role.update': 'Sửa vai trò',
  'size.create': 'Thêm kích cỡ',
  'size.delete': 'Xóa kích cỡ',
  'size.update': 'Sửa kích cỡ',
};

/**
 * Vietnamese label for an audit action code; falls back to the raw code.
 */
export function auditLogActionDisplayName(action: string): string {
  if (!action) {
    return action;
  }
  const key = action as (typeof AUDIT_LOG_ACTION_VALUES)[number];
  return AUDIT_LOG_ACTION_LABELS_VI[key] ?? action;
}

/** Nhóm mã hành động để gán màu badge (xoá đỏ, thêm xanh, …). */
export type AuditLogActionBadgeKind =
  | 'destructive'
  | 'create'
  | 'confirm'
  | 'restore'
  | 'update'
  | 'neutral';

export function auditLogActionBadgeKind(action: string): AuditLogActionBadgeKind {
  if (!action) {
    return 'neutral';
  }
  const a = action.toLowerCase();
  if (a.includes('cancel') || a.includes('delete')) {
    return 'destructive';
  }
  if (a.includes('restore')) {
    return 'restore';
  }
  if (a.includes('confirm')) {
    return 'confirm';
  }
  if (a.includes('.create') || a.endsWith('.upload') || a.includes('create-folder')) {
    return 'create';
  }
  if (a.includes('.update') || a.includes('.move')) {
    return 'update';
  }
  return 'neutral';
}

type BadgeVariant = 'destructive' | 'secondary' | 'outline';

/** `variant` + `className` cho `Badge` cột hành động audit. */
export function getAuditLogActionBadgeStyles(action: string): {
  variant: BadgeVariant;
  className: string;
} {
  const kind = auditLogActionBadgeKind(action);
  const base =
    'inline-flex h-auto max-w-full min-w-0 items-center gap-1.5 border-transparent py-1 font-normal';
  switch (kind) {
    case 'destructive':
      return { variant: 'destructive', className: base };
    case 'create':
      return {
        variant: 'secondary',
        className: `${base} bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900/80`,
      };
    case 'confirm':
      return {
        variant: 'secondary',
        className: `${base} bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900/80`,
      };
    case 'restore':
      return {
        variant: 'secondary',
        className: `${base} bg-sky-50 text-sky-800 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900/80`,
      };
    case 'update':
      return {
        variant: 'secondary',
        className: `${base} bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900/80`,
      };
    case 'neutral':
    default:
      return {
        variant: 'outline',
        className: `${base} text-foreground`,
      };
  }
}

/** Options for faceted filter (sorted by Vietnamese label). */
export function getAuditLogActionFilterOptions(): { label: string; value: string }[] {
  return [...AUDIT_LOG_ACTION_VALUES]
    .map((value) => ({ value, label: auditLogActionDisplayName(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

/**
 * Tiền tố nhóm cho cây lọc hành động (vd. `product.update` → `product`;
 * `profile.employee.update` → `employee` để hiển thị dưới "Nhân viên").
 */
function auditActionFilterGroupKey(action: string): string {
  const segments = action.split('.');
  if (segments[0] === 'profile' && segments.length >= 2) {
    return segments[1] ?? segments[0];
  }
  return segments[0] ?? action;
}

/** Nhóm hành động audit theo tiền tố mã (vd. `product.update` → nhóm `product`). */
export type AuditLogActionFilterGroup = {
  groupKey: string;
  groupLabel: string;
  items: { value: string; label: string }[];
};

/** Cây lọc hành động: nhóm theo tài nguyên, trong nhóm là từng mã cụ thể. */
export function getAuditLogActionFilterTree(): AuditLogActionFilterGroup[] {
  const map = new Map<string, { value: string; label: string }[]>();
  for (const value of AUDIT_LOG_ACTION_VALUES) {
    const groupKey = auditActionFilterGroupKey(value);
    const label = auditLogActionDisplayName(value);
    const list = map.get(groupKey) ?? [];
    list.push({ value, label });
    map.set(groupKey, list);
  }
  const groups: AuditLogActionFilterGroup[] = [];
  for (const [groupKey, items] of map) {
    items.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    groups.push({
      groupKey,
      groupLabel: permissionModuleDisplayName(groupKey),
      items,
    });
  }
  groups.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'vi'));
  return groups;
}
