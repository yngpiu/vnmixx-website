import 'dotenv/config';
import { seedAddresses } from './seed-addresses';
import { seedCategories } from './seed-categories';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedLocations } from './seed-locations';
import { seedMedia } from './seed-media';
import { seedOrders } from './seed-orders';
import { seedProducts } from './seed-products';
import { seedRbac } from './seed-rbac';
import { seedWishlists } from './seed-wishlists';

async function main() {
  console.log('--- STARTING COMPREHENSIVE SEEDING ---');

  // Core & Infrastructure
  await seedRbac();
  await seedLocations();
  await seedMedia();

  // Master Data
  await seedCategories();
  await seedProducts();
  await seedEmployees();
  await seedCustomers();

  // Dependent Data
  await seedAddresses();
  await seedWishlists();
  await seedOrders();

  console.log('--- COMPREHENSIVE SEEDING COMPLETED ---');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
