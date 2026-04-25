import { z } from 'zod/v4';

// Định nghĩa schema validate và ép kiểu cho biến môi trường của ứng dụng.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  CORS_ORIGIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  GHN_API_URL: z.string().url().optional(),
  GHN_TOKEN: z.string().optional(),
  GHN_SHOP_ID: z.coerce.number().optional(),
  GHN_SHOP_DISTRICT_ID: z.string().optional(),
  GHN_SHOP_WARD_ID: z.string().optional(),
  SEPAY_API_KEY: z.string().optional(),
  SEPAY_BANK_CODE: z.string().optional(),
  SEPAY_BANK_NAME: z.string().optional(),
  SEPAY_ACCOUNT_NUMBER: z.string().optional(),
  SEPAY_ACCOUNT_NAME: z.string().optional(),
  SEPAY_QR_TEMPLATE: z.string().optional(),
  SEPAY_CHECKOUT_EXPIRE_MINUTES: z.coerce.number().default(15),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

type EnvVars = z.infer<typeof envSchema>;

// Validate env ở giai đoạn bootstrap, fail-fast nếu cấu hình không hợp lệ.
export function validateEnv(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`❌ Env validation failed:\n${formatted}`);
  }

  const validated = result.data;

  // Kiểm tra ràng buộc nghiệp vụ bổ sung theo môi trường chạy.
  if (validated.NODE_ENV === 'production' && !validated.CORS_ORIGIN) {
    throw new Error('❌ CORS_ORIGIN is required in production');
  }

  return validated;
}
