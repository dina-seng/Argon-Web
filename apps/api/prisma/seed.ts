/**
 * prisma/seed.ts – Clean Database Seeder
 *
 * Seeds baseline users and sample events:
 * - 1 Platform Administrator (admin@argon.kh)
 * - 2 Organizers (barcamp@argon.kh, tedx@argon.kh)
 * - 5 Customers (sokha, dara, bopha, vireak, chann @cadt.edu.kh)
 * - 3 Real baseline events with empty quotas (0 sold, 0 reserved)
 * - 0 fake bookings, 0 fake tickets, 0 fake audit logs
 *
 * Password for all seeded accounts: password123
 *
 * Run with: npm run prisma:seed
 */

import {
  PrismaClient,
  Role,
  EventStatus,
  EventCategory,
} from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic bcrypt hash for 'password123'
const PASSWORD_HASH =
  '$2b$10$t0uV9ExxNFqov8o4hV/dl.si2bCylDrkkaE0hdkDdZgRNtNoLyDQO';

async function main() {
  console.warn('Seeding database with clean baseline data...');

  const now = new Date();

  // 1. Idempotency cleanup: remove prior seeded fixtures safely
  const seedEmails = [
    'admin@argon.kh',
    'barcamp@argon.kh',
    'tedx@argon.kh',
    'sokha@cadt.edu.kh',
    'dara@cadt.edu.kh',
    'bopha@cadt.edu.kh',
    'vireak@cadt.edu.kh',
    'chann@cadt.edu.kh',
  ];

  const seedEventTitles = [
    'BarCamp Phnom Penh 2026',
    'CADT Tech Expo 2026',
    'Cambodia AI Summit',
  ];

  // Clean existing tickets, audit logs, bookings, tiers, events, and users
  const existingEvents = await prisma.event.findMany({
    where: { title: { in: seedEventTitles } },
    select: { id: true },
  });
  const eventIds = existingEvents.map((e) => e.id);

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: seedEmails } },
    select: { id: true },
  });
  const userIds = existingUsers.map((u) => u.id);

  if (eventIds.length > 0 || userIds.length > 0) {
    await prisma.ticket.deleteMany({
      where: {
        OR: [
          { eventId: { in: eventIds } },
          { checkedInBy: { in: userIds } },
          { booking: { userId: { in: userIds } } },
        ],
      },
    });

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: userIds } },
          { entityId: { in: [...eventIds, ...userIds] } },
        ],
      },
    });

    await prisma.booking.deleteMany({
      where: {
        OR: [
          { eventId: { in: eventIds } },
          { userId: { in: userIds } },
        ],
      },
    });

    await prisma.ticketTier.deleteMany({
      where: { eventId: { in: eventIds } },
    });

    await prisma.event.deleteMany({
      where: { id: { in: eventIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  // 2. Create Users
  // 1 Admin
  await prisma.user.create({
    data: {
      email: 'admin@argon.kh',
      name: 'Platform Administrator',
      password: PASSWORD_HASH,
      role: Role.ADMIN,
    },
  });

  // 2 Organizers
  const barcampOrganizer = await prisma.user.create({
    data: {
      email: 'barcamp@argon.kh',
      name: 'BarCamp Cambodia',
      password: PASSWORD_HASH,
      role: Role.ORGANIZER,
    },
  });

  const tedxOrganizer = await prisma.user.create({
    data: {
      email: 'tedx@argon.kh',
      name: 'TEDx Phnom Penh',
      password: PASSWORD_HASH,
      role: Role.ORGANIZER,
    },
  });

  // 5 Customers
  const customerDefs = [
    { email: 'sokha@cadt.edu.kh', name: 'Sokha Chen' },
    { email: 'dara@cadt.edu.kh', name: 'Dara Som' },
    { email: 'bopha@cadt.edu.kh', name: 'Bopha Keo' },
    { email: 'vireak@cadt.edu.kh', name: 'Vireak Meas' },
    { email: 'chann@cadt.edu.kh', name: 'Chann Ly' },
  ];

  for (const def of customerDefs) {
    await prisma.user.create({
      data: {
        email: def.email,
        name: def.name,
        password: PASSWORD_HASH,
        role: Role.CUSTOMER,
      },
    });
  }

  // 3. Create Events & Tiers with real 0-counts
  await prisma.event.create({
    data: {
      organizerId: barcampOrganizer.id,
      title: 'BarCamp Phnom Penh 2026',
      description:
        "Cambodia's premier open tech conference and community gathering connecting developers, designers, students, and technologists.",
      venue: 'CADT Innovation Center',
      startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      category: EventCategory.TECH,
      status: EventStatus.PUBLISHED,
      tiers: {
        create: [
          {
            name: 'Early Bird',
            price: 5.0,
            capacity: 100,
            soldCount: 0,
            reservedCount: 0,
          },
          {
            name: 'Standard Pass',
            price: 10.0,
            capacity: 200,
            soldCount: 0,
            reservedCount: 0,
          },
          {
            name: 'VIP Access',
            price: 25.0,
            capacity: 50,
            soldCount: 0,
            reservedCount: 0,
          },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      organizerId: tedxOrganizer.id,
      title: 'CADT Tech Expo 2026',
      description:
        'Annual student innovation showcase, robotics demonstration, and tech industry fair hosted across CADT Innovation Center.',
      venue: 'Building F Main Hall',
      startsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      category: EventCategory.TECH,
      status: EventStatus.PUBLISHED,
      tiers: {
        create: [
          {
            name: 'Student Pass',
            price: 0.0,
            capacity: 300,
            soldCount: 0,
            reservedCount: 0,
          },
          {
            name: 'General Attendee',
            price: 15.0,
            capacity: 100,
            soldCount: 0,
            reservedCount: 0,
          },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      organizerId: tedxOrganizer.id,
      title: 'Cambodia AI Summit',
      description:
        'Summit exploring AI technology, compute infrastructure, and machine learning adoption.',
      venue: 'Diamond Island Convention Hall',
      startsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      category: EventCategory.TECH,
      status: EventStatus.DRAFT,
      tiers: {
        create: [
          {
            name: 'All Access',
            price: 50.0,
            capacity: 150,
            soldCount: 0,
            reservedCount: 0,
          },
        ],
      },
    },
  });

  console.warn('Seed complete successfully.');
  console.warn('   Users: 1 Admin, 2 Organizers, 5 Customers');
  console.warn('   Events: 3 (2 Published, 1 Draft)');
  console.warn('   Bookings: 0 (No fake transactions)');
  console.warn('   Tickets: 0 (No fake tickets)');
  console.warn('   AuditLogs: 0 (No fake activity logs)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
