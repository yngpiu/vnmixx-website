/**
 * Bản đồ mã → nhãn hiển thị (giữ khớp `apps/dashboard/utils/audit-log-action-label.ts`).
 * Dùng để tìm audit theo tên hành động tiếng Việt trên API.
 */
const AUDIT_LOG_ACTION_LABELS_VI: Record<string, string> = {
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
 * Từ khóa tìm thêm (không nối vào nhãn hiển thị) — vd. gõ "nhân viên" vẫn ra `profile.employee.update`.
 */
const AUDIT_LOG_ACTION_LABEL_SEARCH_EXTRA: Partial<Record<string, string>> = {
  'profile.employee.update': 'nhân viên',
};

/** Các mã hành động có nhãn tiếng Việt chứa chuỗi tìm (không phân biệt hoa thường). */
export function collectAuditLogActionCodesMatchingLabelSearch(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const out: string[] = [];
  for (const [code, label] of Object.entries(AUDIT_LOG_ACTION_LABELS_VI)) {
    const extra = AUDIT_LOG_ACTION_LABEL_SEARCH_EXTRA[code];
    const haystack = `${label}${extra ? ` ${extra}` : ''}`.toLowerCase();
    if (haystack.includes(q)) {
      out.push(code);
    }
  }
  return out;
}
