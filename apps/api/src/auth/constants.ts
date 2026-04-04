/** Default access-token lifetime in seconds (15 min). */
export const DEFAULT_ACCESS_EXPIRATION = 900;

/** Default refresh-token lifetime in seconds (7 days). */
export const DEFAULT_REFRESH_EXPIRATION = 604_800;

/** Default OTP lifetime in seconds (5 min). */
export const DEFAULT_OTP_EXPIRATION = 300;

/** Default OTP resend cooldown in seconds. */
export const DEFAULT_OTP_RESEND_COOLDOWN = 60;

/** Default maximum failed verification attempts per OTP cycle. */
export const DEFAULT_OTP_MAX_ATTEMPTS = 5;

/** Bcrypt salt rounds (clamped to 4–31 at usage site). */
export const BCRYPT_SALT_ROUNDS = 12;

/** Number of digits in customer email verification OTP. */
export const CUSTOMER_OTP_LENGTH = 6;

/** Redis key prefix for blacklisted access tokens. */
export const BLACKLIST_PREFIX = 'bl:' as const;

/** Redis key prefix for per-user "logout all sessions" marker. */
export const LOGOUT_ALL_PREFIX = 'loa:' as const;

/** Redis key prefix for customer registration OTP payload. */
export const CUSTOMER_OTP_PREFIX = 'otp:customer:verify:' as const;

/** Redis key prefix for failed customer OTP attempts. */
export const CUSTOMER_OTP_ATTEMPTS_PREFIX = 'otp:customer:attempts:' as const;

/** Redis key prefix for customer OTP resend cooldown. */
export const CUSTOMER_OTP_RESEND_PREFIX = 'otp:customer:resend:' as const;
