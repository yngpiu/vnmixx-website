/**
 * Seed “nền” cho dev: RBAC/quyền, địa lý hành chính, nhân viên, media nhẹ, vài khách + địa chỉ.
 * Không 200 SP / 1000 đơn / wishlist … — catalog lấy từ Ivy (`pnpm seed:ivy`) sau wipe.
 *
 * Override (optional): `SEED_CUSTOMER_COUNT`, `SEED_MEDIA_COUNT`, `SEED_ADDRESS_CUSTOMER_LIMIT`
 */
import { seedAddresses } from './seed-addresses';
import { SEED_FOUNDATION } from './seed-constants';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedLocations } from './seed-locations';
import { seedMedia } from './seed-media';
import { seedRbac } from './seed-rbac';

function applyFoundationEnvDefaults(): void {
  if (
    typeof process.env.SEED_CUSTOMER_COUNT !== 'string' ||
    process.env.SEED_CUSTOMER_COUNT.trim() === ''
  ) {
    process.env.SEED_CUSTOMER_COUNT = String(SEED_FOUNDATION.customerCount);
  }
  if (
    typeof process.env.SEED_MEDIA_COUNT !== 'string' ||
    process.env.SEED_MEDIA_COUNT.trim() === ''
  ) {
    process.env.SEED_MEDIA_COUNT = String(SEED_FOUNDATION.mediaCount);
  }
  if (
    typeof process.env.SEED_ADDRESS_CUSTOMER_LIMIT !== 'string' ||
    process.env.SEED_ADDRESS_CUSTOMER_LIMIT.trim() === ''
  ) {
    process.env.SEED_ADDRESS_CUSTOMER_LIMIT = process.env.SEED_CUSTOMER_COUNT;
  }
}

async function main(): Promise<void> {
  applyFoundationEnvDefaults();
  console.log('--- SEED FOUNDATION (quyền / địa lý / NV / khách — không đơ & SP faker) ---');
  await seedRbac();
  await seedLocations();
  await seedEmployees();
  await seedMedia();
  await seedCustomers();
  await seedAddresses();
  console.log(
    '--- FOUNDATION DONE — tiếp: `pnpm seed:ivy` (trong Ivy: category DB trước, SP sau), rồi `pnpm seed:banners`. ---',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
