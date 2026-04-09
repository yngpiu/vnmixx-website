import { CACHE_PREFIXES, CACHE_TTL } from '../redis/cache-keys';

/** Default access-token lifetime in seconds (15 min). */
export const DEFAULT_ACCESS_EXPIRATION = 900;

/** Default refresh-token lifetime in seconds (7 days). */
export const DEFAULT_REFRESH_EXPIRATION = 604_800;

/** Default OTP lifetime in seconds (5 min). */
export const DEFAULT_OTP_EXPIRATION = CACHE_TTL.OTP;

/** Default OTP resend cooldown in seconds. */
export const DEFAULT_OTP_RESEND_COOLDOWN = CACHE_TTL.OTP_RESEND_COOLDOWN;

/** Default maximum failed verification attempts per OTP cycle. */
export const DEFAULT_OTP_MAX_ATTEMPTS = 5;

/** Bcrypt salt rounds (clamped to 4–31 at usage site). */
export const BCRYPT_SALT_ROUNDS = 12;

/** Number of digits in customer email verification OTP. */
export const CUSTOMER_OTP_LENGTH = 6;

/** Redis key prefix for blacklisted access tokens. */
export const BLACKLIST_PREFIX = CACHE_PREFIXES.TOKEN_BLACKLIST;

/** Redis key prefix for per-user "logout all sessions" marker. */
export const LOGOUT_ALL_PREFIX = CACHE_PREFIXES.LOGOUT_ALL;

/** Redis key prefix for customer registration OTP payload. */
export const CUSTOMER_OTP_PREFIX = CACHE_PREFIXES.CUSTOMER_OTP_VERIFY;

/** Redis key prefix for failed customer OTP attempts. */
export const CUSTOMER_OTP_ATTEMPTS_PREFIX = CACHE_PREFIXES.CUSTOMER_OTP_ATTEMPTS;

/** Redis key prefix for customer OTP resend cooldown. */
export const CUSTOMER_OTP_RESEND_PREFIX = CACHE_PREFIXES.CUSTOMER_OTP_RESEND;

/** Redis key prefix for customer password reset OTP payload. */
export const CUSTOMER_RESET_OTP_PREFIX = CACHE_PREFIXES.CUSTOMER_RESET_OTP;

/** Redis key prefix for failed customer password reset OTP attempts. */
export const CUSTOMER_RESET_OTP_ATTEMPTS_PREFIX = CACHE_PREFIXES.CUSTOMER_RESET_OTP_ATTEMPTS;

/** Redis key prefix for customer password reset OTP resend cooldown. */
export const CUSTOMER_RESET_OTP_RESEND_PREFIX = CACHE_PREFIXES.CUSTOMER_RESET_OTP_RESEND;

/** Redis key prefix for customer password reset token (post-OTP, pre-password-change). */
export const CUSTOMER_RESET_TOKEN_PREFIX = CACHE_PREFIXES.CUSTOMER_RESET_TOKEN;

/** Lifetime of a password reset token in seconds (10 min). */
export const DEFAULT_RESET_TOKEN_EXPIRATION = CACHE_TTL.RESET_TOKEN;
