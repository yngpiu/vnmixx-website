import 'dotenv/config';
import { seedCategories } from './seed-categories';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedProducts } from './seed-products';
import { seedRbac } from './seed-rbac';

async function main() {
  await seedRbac();
  await seedCategories();
  await seedProducts();
  await seedEmployees();
  await seedCustomers();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
