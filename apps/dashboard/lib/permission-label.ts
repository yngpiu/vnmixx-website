/** Phần trước dấu chấm đầu tiên trong mã quyền (vd. `category.read` → `category`). */
export function permissionModuleLabel(permissionName: string): string {
  const dot = permissionName.indexOf('.');
  return dot === -1 ? permissionName : permissionName.slice(0, dot);
}

/** Tên hiển thị tiếng Việt cho tiền tố tài nguyên trong mã quyền (đồng bộ với ma trận CRUD). */
const PERMISSION_RESOURCE_LABELS_VI: Record<string, string> = {
  audit: 'Nhật ký thao tác',
  rbac: 'Phân quyền',
  role: 'Vai trò',
  order: 'Đơn hàng',
  customer: 'Khách hàng',
  employee: 'Nhân viên',
  product: 'Sản phẩm',
  category: 'Danh mục',
  color: 'Màu sắc',
  size: 'Kích cỡ',
  media: 'Thư viện ảnh',
  review: 'Đánh giá',
};

/**
 * Tiêu đề nhóm quyền cho UI (tiếng Việt). Nếu chưa khai báo trong bảng map, trả về mã gốc.
 */
export function permissionModuleDisplayName(moduleKey: string): string {
  if (!moduleKey) return moduleKey;
  return PERMISSION_RESOURCE_LABELS_VI[moduleKey] ?? moduleKey;
}
