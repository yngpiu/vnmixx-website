import { seedAddresses } from './seed-addresses';
import { seedAuditLogs } from './seed-audit-logs';
import { seedCategories } from './seed-categories';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedLocations } from './seed-locations';
import { seedMedia } from './seed-media';
import { seedOrders } from './seed-orders';
import { seedProductReviews } from './seed-product-reviews';
import { seedProducts } from './seed-products';
import { seedRbac } from './seed-rbac';
import { seedWishlists } from './seed-wishlists';

async function main() {
  console.log('--- STARTING COMPREHENSIVE SEEDING ---');

  await seedRbac();
  await seedLocations();
  await seedMedia();

  await seedCategories();
  await seedProducts();
  await seedEmployees();
  await seedCustomers();

  await seedAddresses();
  await seedWishlists();
  await seedOrders();
  await seedProductReviews();
  await seedAuditLogs();

  console.log('--- COMPREHENSIVE SEEDING COMPLETED ---');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
