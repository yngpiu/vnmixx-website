/** Phần trước dấu chấm đầu tiên trong mã quyền (vd. `category.read` → `category`). */
export function permissionModuleLabel(permissionName: string): string {
  const dot = permissionName.indexOf('.');
  return dot === -1 ? permissionName : permissionName.slice(0, dot);
}
