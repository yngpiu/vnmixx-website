import { permissionModuleDisplayName } from '@/lib/permission-label';

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
  'media.batch-delete',
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
  'category.create': 'Th\u00eam danh m\u1ee5c',
  'category.delete': 'X\u00f3a danh m\u1ee5c',
  'category.restore': 'Kh\u00f4i ph\u1ee5c danh m\u1ee5c',
  'category.update': 'S\u1eeda danh m\u1ee5c',
  'color.create': 'Th\u00eam m\u00e0u s\u1eafc',
  'color.delete': 'X\u00f3a m\u00e0u s\u1eafc',
  'color.update': 'S\u1eeda m\u00e0u s\u1eafc',
  'customer.delete': 'X\u00f3a kh\u00e1ch h\u00e0ng',
  'customer.restore': 'Kh\u00f4i ph\u1ee5c kh\u00e1ch h\u00e0ng',
  'customer.update': 'S\u1eeda kh\u00e1ch h\u00e0ng',
  'employee.create': 'Th\u00eam nh\u00e2n vi\u00ean',
  'employee.delete': 'X\u00f3a nh\u00e2n vi\u00ean',
  'employee.restore': 'Kh\u00f4i ph\u1ee5c nh\u00e2n vi\u00ean',
  'employee.update': 'S\u1eeda nh\u00e2n vi\u00ean',
  'media.batch-delete': 'X\u00f3a h\u00e0ng lo\u1ea1t th\u01b0 vi\u1ec7n',
  'media.create-folder': 'T\u1ea1o th\u01b0 m\u1ee5c th\u01b0 vi\u1ec7n',
  'media.delete': 'X\u00f3a t\u1ec7p th\u01b0 vi\u1ec7n',
  'media.delete-folder': 'X\u00f3a th\u01b0 m\u1ee5c th\u01b0 vi\u1ec7n',
  'media.move': 'Di chuy\u1ec3n th\u01b0 vi\u1ec7n',
  'media.upload': 'T\u1ea3i l\u00ean th\u01b0 vi\u1ec7n',
  'order.cancel': 'H\u1ee7y \u0111\u01a1n h\u00e0ng',
  'order.confirm': 'X\u00e1c nh\u1eadn \u0111\u01a1n h\u00e0ng',
  'order.confirm-payment': 'X\u00e1c nh\u1eadn thanh to\u00e1n \u0111\u01a1n h\u00e0ng',
  'product.create': 'Th\u00eam s\u1ea3n ph\u1ea9m',
  'product.delete': 'X\u00f3a s\u1ea3n ph\u1ea9m',
  'product.image.create': 'Th\u00eam \u1ea3nh s\u1ea3n ph\u1ea9m',
  'product.image.delete': 'X\u00f3a \u1ea3nh s\u1ea3n ph\u1ea9m',
  'product.image.update': 'S\u1eeda \u1ea3nh s\u1ea3n ph\u1ea9m',
  'product.restore': 'Kh\u00f4i ph\u1ee5c s\u1ea3n ph\u1ea9m',
  'product.update': 'S\u1eeda s\u1ea3n ph\u1ea9m',
  'product.variant.create': 'Th\u00eam bi\u1ebfn th\u1ec3 s\u1ea3n ph\u1ea9m',
  'product.variant.delete': 'X\u00f3a bi\u1ebfn th\u1ec3 s\u1ea3n ph\u1ea9m',
  'product.variant.update': 'S\u1eeda bi\u1ebfn th\u1ec3 s\u1ea3n ph\u1ea9m',
  'profile.employee.update': 'S\u1eeda h\u1ed3 s\u01a1 (nh\u00e2n vi\u00ean)',
  'role.create': 'Th\u00eam vai tr\u00f2',
  'role.delete': 'X\u00f3a vai tr\u00f2',
  'role.update': 'S\u1eeda vai tr\u00f2',
  'size.create': 'Th\u00eam k\u00edch c\u1ee1',
  'size.delete': 'X\u00f3a k\u00edch c\u1ee1',
  'size.update': 'S\u1eeda k\u00edch c\u1ee1',
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

/** Options for faceted filter (sorted by Vietnamese label). */
export function getAuditLogActionFilterOptions(): { label: string; value: string }[] {
  return [...AUDIT_LOG_ACTION_VALUES]
    .map((value) => ({ value, label: auditLogActionDisplayName(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
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
    const groupKey = value.split('.')[0] ?? value;
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
