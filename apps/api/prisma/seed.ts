/**
 * prisma/seed.ts – database seeder for local development.
 * Creates a dev organizer with sample events. Safe to run repeatedly.
 * TODO: Add CUSTOMER and ADMIN users once auth (bcrypt) is implemented.
 * Run with: npm run prisma:seed
 */

import { PrismaClient, Role, EventStatus, EventCategory } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_ORGANIZER_EMAIL = 'organizer@argon.dev';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const SAMPLE_EVENTS = [
  { title: 'Phnom Penh Jazz Night', category: EventCategory.MUSIC, venue: 'Riverside Hall, Phnom Penh', days: 7, hour: 19, capacity: 200 },
  { title: 'Angkor Half Marathon Warm-up Run', category: EventCategory.SPORTS, venue: 'Siem Reap Old Market', days: 12, hour: 6, capacity: 500 },
  { title: 'Khmer Street Food Festival', category: EventCategory.FOOD, venue: 'Koh Pich, Phnom Penh', days: 18, hour: 16, capacity: 1000 },
  { title: 'Contemporary Khmer Art Exhibition', category: EventCategory.ARTS, venue: 'Meta House, Phnom Penh', days: 25, hour: 10, capacity: 150 },
  { title: 'Cambodia Startup Meetup', category: EventCategory.TECH, venue: 'Factory Phnom Penh', days: 32, hour: 18, capacity: 120 },
  { title: 'Battambang Bamboo Train Tour', category: EventCategory.OTHER, venue: 'Battambang', days: 40, hour: 8, capacity: 60, draft: true },
];

async function main() {
  console.warn('🌱 Seeding database...');

  const organizer = await prisma.user.upsert({
    where: { email: DEV_ORGANIZER_EMAIL },
    update: {},
    // '!' is never a valid bcrypt hash, so this account can't log in with a password.
    // Use `npm run dev:token` to get a token for it.
    create: { email: DEV_ORGANIZER_EMAIL, password: '!', name: 'Dev Organizer', role: Role.ORGANIZER },
  });

  const existing = await prisma.event.count({ where: { organizerId: organizer.id } });
  if (existing === 0) {
    for (const e of SAMPLE_EVENTS) {
      await prisma.event.create({
        data: {
          organizerId: organizer.id,
          title: e.title,
          description: `${e.title} – sample event created by the dev seed.`,
          venue: e.venue,
          startsAt: daysFromNow(e.days, e.hour),
          category: e.category,
          status: e.draft ? EventStatus.DRAFT : EventStatus.PUBLISHED,
          tiers: { create: { name: 'General Admission', price: 0, capacity: e.capacity } },
        },
      });
    }
  }

  console.warn(`✅ Seed complete. Organizer: ${DEV_ORGANIZER_EMAIL}, events: ${existing || SAMPLE_EVENTS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
