// ─── Cache key prefixes ───────────────────────────────────────────────────────

export const CACHE_KEYS = {
  // Location (static data)
  CITIES: 'loc:cities',
  DISTRICTS: (cityId: number) => `loc:districts:${cityId}`,
  WARDS: (districtId: number) => `loc:wards:${districtId}`,

  // Lookup tables
  COLOR_LIST: 'color:list',
  SIZE_LIST: 'size:list',

  // Category
  CATEGORY_LIST: 'cat:list',
  CATEGORY_TREE: 'cat:tree',
  CATEGORY_SLUG: (slug: string) => `cat:slug:${slug}`,

  // Product
  PRODUCT_SLUG: (slug: string) => `prod:slug:${slug}`,
  PRODUCT_LIST: (hash: string) => `prod:list:${hash}`,

  // Auth and security
  TOKEN_BLACKLIST: (jti: string) => `bl:${jti}`,
  LOGOUT_ALL: (userType: string, userId: number | string) => `loa:${userType}:${userId}`,
  CUSTOMER_OTP_VERIFY: (email: string) => `otp:customer:verify:${email}`,
  CUSTOMER_OTP_ATTEMPTS: (email: string) => `otp:customer:attempts:${email}`,
  CUSTOMER_OTP_RESEND: (email: string) => `otp:customer:resend:${email}`,
  CUSTOMER_RESET_OTP: (email: string) => `otp:customer:reset:${email}`,
  CUSTOMER_RESET_OTP_ATTEMPTS: (email: string) => `otp:customer:reset-attempts:${email}`,
  CUSTOMER_RESET_OTP_RESEND: (email: string) => `otp:customer:reset-resend:${email}`,
  CUSTOMER_RESET_TOKEN: (email: string) => `pwreset:customer:${email}`,

  // Rate limiting
  THROTTLE: (key: string) => `throttle:${key}`,
  THROTTLE_BLOCK: (key: string) => `throttle:${key}:blocked`,
} as const;

// ─── Cache TTLs (seconds) ─────────────────────────────────────────────────────

export const CACHE_TTL = {
  LOCATION: 86_400, // 24h — static data
  COLOR: 3_600, // 1h
  SIZE: 3_600, // 1h
  CATEGORY: 600, // 10min
  PRODUCT_DETAIL: 300, // 5min
  PRODUCT_LIST: 60, // 1min

  // Auth and security
  OTP: 300, // 5min
  OTP_RESEND_COOLDOWN: 60, // 1min
  RESET_TOKEN: 600, // 10min
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
