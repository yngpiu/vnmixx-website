import { seedAddresses } from './seed-addresses';
import { seedAuditLogs } from './seed-audit-logs';
import { seedBanners } from './seed-banners';
import { seedCategories } from './seed-categories';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedInventory } from './seed-inventory';
import { seedLocations } from './seed-locations';
import { seedMedia } from './seed-media';
import { seedOrders } from './seed-orders';
import { seedProductReviews } from './seed-product-reviews';
import { seedProducts } from './seed-products';
import { seedRbac } from './seed-rbac';
import { seedSupportChats } from './seed-support-chat';
import { seedWishlists } from './seed-wishlists';

async function main() {
  console.log('--- STARTING COMPREHENSIVE SEEDING ---');

  await seedRbac();
  await seedLocations();
  await seedMedia();

  await seedCategories();
  await seedBanners();
  await seedProducts();
  await seedEmployees();
  await seedCustomers();
  await seedSupportChats();

  await seedAddresses();
  await seedWishlists();
  await seedOrders();
  await seedProductReviews();
  await seedInventory();
  await seedAuditLogs();

  console.log('--- COMPREHENSIVE SEEDING COMPLETED ---');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
