export const AUTH_CACHE_KEYS = {
  EMPLOYEE_AUTHZ: (employeeId: number) => `authz:emp:${employeeId}`,
} as const;

export const AUTH_CACHE_PREFIXES = {
  TOKEN_BLACKLIST: 'bl:',
  LOGOUT_ALL: 'loa:',
  CUSTOMER_OTP_VERIFY: 'otp:customer:verify:',
  CUSTOMER_OTP_ATTEMPTS: 'otp:customer:attempts:',
  CUSTOMER_OTP_RESEND: 'otp:customer:resend:',
  CUSTOMER_RESET_OTP: 'otp:customer:reset:',
  CUSTOMER_RESET_OTP_ATTEMPTS: 'otp:customer:reset-attempts:',
  CUSTOMER_RESET_OTP_RESEND: 'otp:customer:reset-resend:',
  CUSTOMER_RESET_TOKEN: 'pwreset:customer:',
} as const;

export const AUTH_CACHE_TTL = {
  OTP: 300,
  OTP_RESEND_COOLDOWN: 60,
  RESET_TOKEN: 600,
  EMPLOYEE_AUTHZ: 86_400,
} as const;
