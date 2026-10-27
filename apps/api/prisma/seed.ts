/**
 * prisma/seed.ts – database seeder for local development.
 * TODO: Create sample users (CUSTOMER, ORGANIZER, ADMIN), a sample event with tiers.
 * Run with: npm run prisma:seed
 */

import { PrismaClient, Role, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.warn('🌱 Seeding database...');

  // TODO: implement seed data
  // Example shape (not yet implemented):
  // await prisma.user.upsert({
  //   where: { email: 'admin@argon.app' },
  //   update: {},
  //   create: { email: 'admin@argon.app', password: '<bcrypt hash>', name: 'Admin', role: Role.ADMIN },
  // });

  // Suppress unused import warnings until implemented
  void Role;
  void EventStatus;

  console.warn('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
