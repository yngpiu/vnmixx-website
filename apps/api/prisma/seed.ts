import 'dotenv/config';
import { seedCustomers } from './seed-customers';
import { seedEmployees } from './seed-employees';
import { seedRbac } from './seed-rbac';

async function main() {
  await seedRbac();
  await seedEmployees();
  await seedCustomers();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
