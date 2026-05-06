/**
 * Tunable defaults for `pnpm db:seed` (local/dev only; not from env).
 * Change here if you need larger or smaller demo datasets.
 */
export const SEED_CONFIG = {
  /** Optional fixed anchor ISO; leave empty to use current runtime time. */
  asOfIso: '',
  mediaCount: 120,
  productCount: 200,
  customerCount: 500,
  orderCount: 2400,
  addressCustomerLimit: 350,
  supportChatCount: 48,
  inventoryVoucherCount: 72,
  reviewMaxOrders: 60_000,
  reviewOrderFraction: 0.7,
  auditLogCount: 1600,
  /** Dev-only password for seeded customer and employee logins. */
  devSeedPassword: '12345678',
} as const;

/**
 * Gói seed “nền” (RBAC, địa lý, ít khách, …) trước khi nạp catalog Ivy — không 200 SP / đơn ảo.
 * Ghi đè tạm bằng env: `SEED_CUSTOMER_COUNT`, `SEED_MEDIA_COUNT`, `SEED_ADDRESS_CUSTOMER_LIMIT`.
 */
export const SEED_FOUNDATION = {
  customerCount: 16,
  mediaCount: 48,
} as const;
