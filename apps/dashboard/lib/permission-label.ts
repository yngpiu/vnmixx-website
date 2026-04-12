/** Phần trước dấu chấm đầu tiên trong mã quyền (vd. `category.read` → `category`). */
export function permissionModuleLabel(permissionName: string): string {
  const dot = permissionName.indexOf('.');
  return dot === -1 ? permissionName : permissionName.slice(0, dot);
}

/** Hiển thị nhóm quyền cho UI (vd. `product_category` → `Product category`). */
export function permissionModuleTitle(moduleKey: string): string {
  if (!moduleKey) return moduleKey;
  return moduleKey
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
