import 'dotenv/config';
import { seedEmployees } from './seed-employees';
import { seedRbac } from './seed-rbac';

async function main() {
  await seedRbac();
  await seedEmployees();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
