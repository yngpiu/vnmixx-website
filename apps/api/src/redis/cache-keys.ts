/**
 * Định nghĩa tập trung các Key Cache sử dụng trong ứng dụng.
 * Giúp đảm bảo tính nhất quán và tránh trùng lặp khóa khi làm việc với Redis.
 */
// ─── Tiền tố Key Cache (Cache key prefixes) ───────────────────────────────────────────────────────

export const CACHE_KEYS = {
  // Địa chỉ (Dữ liệu tĩnh)
  CITIES: 'loc:cities',
  DISTRICTS: (cityId: number) => `loc:districts:${cityId}`,
  WARDS: (districtId: number) => `loc:wards:${districtId}`,

  // Các bảng tra cứu (Lookup tables)
  COLOR_LIST: 'color:list',
  SIZE_LIST: 'size:list',

  // Danh mục sản phẩm (Category)
  CATEGORY_LIST: 'cat:list',
  CATEGORY_TREE: 'cat:tree',
  CATEGORY_SLUG: (slug: string) => `cat:slug:${slug}`,

  // Sản phẩm (Product)
  PRODUCT_SLUG: (slug: string) => `prod:slug:${slug}`,
  PRODUCT_LIST: (hash: string) => `prod:list:${hash}`,

  // Xác thực và Bảo mật (Auth and security)
  TOKEN_BLACKLIST: (jti: string) => `bl:${jti}`,
  LOGOUT_ALL: (userType: string, userId: number | string) => `loa:${userType}:${userId}`,
  /** Lưu cache roles + permission names của nhân viên (bị hủy khi RBAC thay đổi). */
  EMPLOYEE_AUTHZ: (employeeId: number) => `authz:emp:${employeeId}`,
  CUSTOMER_OTP_VERIFY: (email: string) => `otp:customer:verify:${email}`,
  CUSTOMER_OTP_ATTEMPTS: (email: string) => `otp:customer:attempts:${email}`,
  CUSTOMER_OTP_RESEND: (email: string) => `otp:customer:resend:${email}`,
  CUSTOMER_RESET_OTP: (email: string) => `otp:customer:reset:${email}`,
  CUSTOMER_RESET_OTP_ATTEMPTS: (email: string) => `otp:customer:reset-attempts:${email}`,
  CUSTOMER_RESET_OTP_RESEND: (email: string) => `otp:customer:reset-resend:${email}`,
  CUSTOMER_RESET_TOKEN: (email: string) => `pwreset:customer:${email}`,

  // Giới hạn tần suất (Rate limiting)
  THROTTLE: (key: string) => `throttle:${key}`,
  THROTTLE_BLOCK: (key: string) => `throttle:${key}:blocked`,
} as const;

/**
 * Thời gian tồn tại của Cache (TTLs - tính bằng giây).
 */
// ─── Cache TTLs (seconds) ─────────────────────────────────────────────────────

export const CACHE_TTL = {
  LOCATION: 86_400, // 24 giờ — dữ liệu tĩnh
  COLOR: 3_600, // 1 giờ
  SIZE: 3_600, // 1 giờ
  CATEGORY: 600, // 10 phút
  PRODUCT_DETAIL: 300, // 5 phút
  PRODUCT_LIST: 60, // 1 phút

  // Xác thực và Bảo mật (Auth and security)
  OTP: 300, // 5 phút
  OTP_RESEND_COOLDOWN: 60, // 1 phút
  RESET_TOKEN: 600, // 10 phút
  /** Cache quyền hạn nhân viên để validate JWT. TTL chỉ là dự phòng, fresh dữ liệu được đảm bảo qua việc xóa cache khi RBAC thay đổi. */
  EMPLOYEE_AUTHZ: 86_400, // 24 giờ
} as const;

// ─── Redis key prefixes (for legacy callsites) ───────────────────────────────

export const CACHE_PREFIXES = {
  TOKEN_BLACKLIST: 'bl:',
  LOGOUT_ALL: 'loa:',
  CUSTOMER_OTP_VERIFY: 'otp:customer:verify:',
  CUSTOMER_OTP_ATTEMPTS: 'otp:customer:attempts:',
  CUSTOMER_OTP_RESEND: 'otp:customer:resend:',
  CUSTOMER_RESET_OTP: 'otp:customer:reset:',
  CUSTOMER_RESET_OTP_ATTEMPTS: 'otp:customer:reset-attempts:',
  CUSTOMER_RESET_OTP_RESEND: 'otp:customer:reset-resend:',
  CUSTOMER_RESET_TOKEN: 'pwreset:customer:',
  THROTTLE: 'throttle:',
} as const;

// ─── Invalidation patterns ────────────────────────────────────────────────────

export const CACHE_PATTERNS = {
  ALL_CATEGORIES: 'cat:*',
  ALL_PRODUCT_LISTS: 'prod:list:*',
} as const;
