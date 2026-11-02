/**
 * prisma/seed.ts – database seeder for local development.
 * Run with: npm run prisma:seed
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually since tsx doesn't auto-load it
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* .env not found – rely on existing env */ }

import { PrismaClient, Role, EventStatus, EventCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_ORGANIZER_EMAIL = 'organizer@argon.dev';
const DEV_CUSTOMER_EMAIL  = 'customer@argon.dev';
const DEV_ADMIN_EMAIL     = 'admin@argon.dev';
const DEV_PASSWORD        = 'Argon1234!';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// coverImageUrl is null — EventCover.tsx shows category gradient + icon placeholders
const SAMPLE_EVENTS = [
  { title: 'Phnom Penh Jazz Night',             category: EventCategory.MUSIC,  venue: 'Riverside Hall, Phnom Penh',   days: 7,  hour: 19, capacity: 200  },
  { title: 'Angkor Half Marathon Warm-up Run',  category: EventCategory.SPORTS, venue: 'Siem Reap Old Market',         days: 12, hour: 6,  capacity: 500  },
  { title: 'Khmer Street Food Festival',        category: EventCategory.FOOD,   venue: 'Koh Pich, Phnom Penh',        days: 18, hour: 16, capacity: 1000 },
  { title: 'Contemporary Khmer Art Exhibition', category: EventCategory.ARTS,   venue: 'Meta House, Phnom Penh',      days: 25, hour: 10, capacity: 150  },
  { title: 'Cambodia Startup Meetup',           category: EventCategory.TECH,   venue: 'Factory Phnom Penh',          days: 32, hour: 18, capacity: 120  },
  { title: 'Battambang Bamboo Train Tour',      category: EventCategory.OTHER,  venue: 'Battambang',                  days: 40, hour: 8,  capacity: 60,  draft: true },
  { title: 'Rooftop Electronic Music Night',    category: EventCategory.MUSIC,  venue: 'Skybar Phnom Penh',           days: 9,  hour: 20, capacity: 300  },
  { title: 'Mekong Cycling Challenge',          category: EventCategory.SPORTS, venue: 'Kampong Cham Riverside',      days: 15, hour: 7,  capacity: 250  },
  { title: 'Cambodian Coffee & Craft Fair',     category: EventCategory.FOOD,   venue: 'Orussey Market, Phnom Penh', days: 22, hour: 9,  capacity: 400  },
  { title: 'Digital Nomad Networking Night',    category: EventCategory.TECH,   venue: 'The Factory, Siem Reap',      days: 28, hour: 18, capacity: 80   },
] as const;

async function main() {
  console.warn('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const organizer = await prisma.user.upsert({
    where: { email: DEV_ORGANIZER_EMAIL },
    update: { password: passwordHash },
    create: { email: DEV_ORGANIZER_EMAIL, password: passwordHash, name: 'Dev Organizer', role: Role.ORGANIZER },
  });

  await prisma.user.upsert({
    where: { email: DEV_CUSTOMER_EMAIL },
    update: { password: passwordHash },
    create: { email: DEV_CUSTOMER_EMAIL, password: passwordHash, name: 'Dev Customer', role: Role.CUSTOMER },
  });

  await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: { password: passwordHash },
    create: { email: DEV_ADMIN_EMAIL, password: passwordHash, name: 'Dev Admin', role: Role.ADMIN },
  });

  for (const e of SAMPLE_EVENTS) {
    const exists = await prisma.event.findFirst({ where: { organizerId: organizer.id, title: e.title } });
    if (!exists) {
      await prisma.event.create({
        data: {
          organizerId: organizer.id,
          title: e.title,
          description: `${e.title} – sample event created by the dev seed.`,
          venue: e.venue,
          startsAt: daysFromNow(e.days, e.hour),
          category: e.category,
          coverImageUrl: null,
          status: 'draft' in e && e.draft ? EventStatus.DRAFT : EventStatus.PUBLISHED,
          tiers: { create: { name: 'General Admission', price: 0, capacity: e.capacity } },
        },
      });
    } else {
      // Clear any previously set coverImageUrl so the gradient placeholder shows
      await prisma.event.update({ where: { id: exists.id }, data: { coverImageUrl: null } });
    }
  }

  const total = await prisma.event.count({ where: { organizerId: organizer.id } });
  console.warn('✅ Seed complete.');
  console.warn('   organizer@argon.dev  /  customer@argon.dev  /  admin@argon.dev');
  console.warn(`   password: ${DEV_PASSWORD}`);
  console.warn(`   events total: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
