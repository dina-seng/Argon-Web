/**
 * prisma/seed.ts – Realistic Multi-Event Database Seeder
 *
 * Seeds:
 * - 1 Platform Administrator
 * - 2 Organizers (BarCamp Cambodia, TEDx Phnom Penh)
 * - 5 Attendee Customers
 * - 3 Realistic Events with tiered pricing quotas
 * - 24 Bookings with mixed statuses (PAID, PENDING)
 * - 22 Tickets with unique qrToken fixtures and checked-in statuses
 * - 19 AuditLog history entries
 *
 * Run with: npm run prisma:seed
 */

import crypto from 'node:crypto';
import {
  PrismaClient,
  Role,
  EventStatus,
  EventCategory,
  BookingStatus,
  TicketStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic bcrypt hash for 'password123'
const PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

async function main() {
  console.warn('🌱 Seeding database with realistic multi-event fixtures...');

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

  // Clean existing tickets and audit logs associated with seeded events/users
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
  const admin = await prisma.user.create({
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

  // 5 Attendee Customers
  const customerDefs = [
    { email: 'sokha@cadt.edu.kh', name: 'Sokha Chen' },
    { email: 'dara@cadt.edu.kh', name: 'Dara Som' },
    { email: 'bopha@cadt.edu.kh', name: 'Bopha Keo' },
    { email: 'vireak@cadt.edu.kh', name: 'Vireak Meas' },
    { email: 'chann@cadt.edu.kh', name: 'Chann Ly' },
  ];

  const customers: Array<{ id: string; email: string; name: string }> = [];
  for (const def of customerDefs) {
    const cust = await prisma.user.create({
      data: {
        email: def.email,
        name: def.name,
        password: PASSWORD_HASH,
        role: Role.CUSTOMER,
      },
    });
    customers.push(cust);
  }

  // 3. Create Events & Tiers
  // Event 1: BarCamp Phnom Penh 2026 (starts in 7 days, PUBLISHED)
  const event1 = await prisma.event.create({
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
            soldCount: 100,
            reservedCount: 0,
          },
          {
            name: 'Standard Pass',
            price: 10.0,
            capacity: 200,
            soldCount: 150,
            reservedCount: 10,
          },
          {
            name: 'VIP Access',
            price: 25.0,
            capacity: 50,
            soldCount: 40,
            reservedCount: 0,
          },
        ],
      },
    },
    include: { tiers: true },
  });

  // Event 2: CADT Tech Expo 2026 (starts in 2 days, PUBLISHED)
  const event2 = await prisma.event.create({
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
            soldCount: 280,
            reservedCount: 0,
          },
          {
            name: 'General Attendee',
            price: 15.0,
            capacity: 100,
            soldCount: 50,
            reservedCount: 5,
          },
        ],
      },
    },
    include: { tiers: true },
  });

  // Event 3: Cambodia AI Summit (starts in 30 days, DRAFT)
  const event3 = await prisma.event.create({
    data: {
      organizerId: tedxOrganizer.id,
      title: 'Cambodia AI Summit',
      description:
        'Executive summit exploring national AI policy, sovereign compute infrastructure, and enterprise machine learning adoption.',
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
    include: { tiers: true },
  });

  // Helper to safely get tier ID
  const getTierId = (tiers: Array<{ id: string; name: string }>, name: string): string => {
    const match = tiers.find((t) => t.name === name);
    if (!match) throw new Error(`Tier "${name}" not found`);
    return match.id;
  };

  const e1EarlyBirdId = getTierId(event1.tiers, 'Early Bird');
  const e1StandardPassId = getTierId(event1.tiers, 'Standard Pass');
  const e1VipAccessId = getTierId(event1.tiers, 'VIP Access');

  const e2StudentPassId = getTierId(event2.tiers, 'Student Pass');
  const e2GeneralAttendeeId = getTierId(event2.tiers, 'General Attendee');

  // 4. Create 24 Bookings with mixed statuses (20 PAID, 4 PENDING)
  const bookingConfigs: Array<{
    customerIdx: number;
    eventId: string;
    tierId: string;
    status: BookingStatus;
    quantity: number;
  }> = [
    // Customer 0: Sokha (5 bookings: 4 PAID, 1 PENDING)
    { customerIdx: 0, eventId: event1.id, tierId: e1EarlyBirdId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 0, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 0, eventId: event2.id, tierId: e2StudentPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 0, eventId: event1.id, tierId: e1VipAccessId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 0, eventId: event2.id, tierId: e2GeneralAttendeeId, status: BookingStatus.PENDING, quantity: 1 },

    // Customer 1: Dara (5 bookings: 4 PAID, 1 PENDING)
    { customerIdx: 1, eventId: event1.id, tierId: e1EarlyBirdId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 1, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 1, eventId: event2.id, tierId: e2StudentPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 1, eventId: event2.id, tierId: e2GeneralAttendeeId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 1, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PENDING, quantity: 1 },

    // Customer 2: Bopha (5 bookings: 5 PAID)
    { customerIdx: 2, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 2, eventId: event1.id, tierId: e1VipAccessId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 2, eventId: event2.id, tierId: e2StudentPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 2, eventId: event2.id, tierId: e2GeneralAttendeeId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 2, eventId: event1.id, tierId: e1EarlyBirdId, status: BookingStatus.PAID, quantity: 1 },

    // Customer 3: Vireak (5 bookings: 4 PAID, 1 PENDING)
    { customerIdx: 3, eventId: event1.id, tierId: e1EarlyBirdId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 3, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 3, eventId: event2.id, tierId: e2StudentPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 3, eventId: event1.id, tierId: e1VipAccessId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 3, eventId: event2.id, tierId: e2GeneralAttendeeId, status: BookingStatus.PENDING, quantity: 1 },

    // Customer 4: Chann (4 bookings: 3 PAID, 1 PENDING)
    { customerIdx: 4, eventId: event1.id, tierId: e1EarlyBirdId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 4, eventId: event1.id, tierId: e1StandardPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 4, eventId: event2.id, tierId: e2StudentPassId, status: BookingStatus.PAID, quantity: 1 },
    { customerIdx: 4, eventId: event2.id, tierId: e2GeneralAttendeeId, status: BookingStatus.PENDING, quantity: 1 },
  ];

  const createdBookings = [];
  for (let i = 0; i < bookingConfigs.length; i++) {
    const cfg = bookingConfigs[i];
    if (!cfg) continue;
    const customer = customers[cfg.customerIdx];
    if (!customer) continue;
    const isPaid = cfg.status === BookingStatus.PAID;
    const bookingNumber = String(i + 1).padStart(4, '0');

    const booking = await prisma.booking.create({
      data: {
        userId: customer.id,
        eventId: cfg.eventId,
        tierId: cfg.tierId,
        status: cfg.status,
        quantity: cfg.quantity,
        paymentReference: isPaid ? `PAY_KHQR_2026_${bookingNumber}` : null,
        gatewayTransactionId: isPaid ? `BAKONG_TXN_${100000 + i}` : null,
        expiresAt: isPaid ? null : new Date(now.getTime() + 15 * 60 * 1000),
        createdAt: new Date(now.getTime() - (25 - i) * 3600 * 1000),
      },
    });
    createdBookings.push(booking);
  }

  // 5. Create 20+ Tickets for PAID bookings with unique qrTokens
  const paidBookings = createdBookings.filter((b) => b.status === BookingStatus.PAID);
  const createdTickets = [];

  for (let i = 0; i < paidBookings.length; i++) {
    const booking = paidBookings[i];
    if (!booking) continue;
    const ticketSeq = String(i + 1).padStart(4, '0');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const isCheckedIn = i < 8; // First 8 tickets are marked CHECKED_IN

    const ticket = await prisma.ticket.create({
      data: {
        bookingId: booking.id,
        eventId: booking.eventId,
        status: isCheckedIn ? TicketStatus.CHECKED_IN : TicketStatus.ACTIVE,
        qrToken: `argon_tkt_${ticketSeq}_${randomHex}`,
        checkedInAt: isCheckedIn
          ? new Date(now.getTime() - (8 - i) * 20 * 60 * 1000)
          : null,
        checkedInBy: isCheckedIn ? admin.id : null,
        createdAt: booking.createdAt,
      },
    });
    createdTickets.push(ticket);
  }

  // 6. Create 19 AuditLog entries
  const event1FirstTierId = event1.tiers[0]?.id ?? 'tier-e1-1';
  const event2FirstTierId = event2.tiers[0]?.id ?? 'tier-e2-1';

  const auditLogsData = [
    // Event creation logs
    {
      actorId: barcampOrganizer.id,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: event1.id,
      metadata: { title: event1.title, venue: event1.venue, status: event1.status },
      createdAt: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
    },
    {
      actorId: tedxOrganizer.id,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: event2.id,
      metadata: { title: event2.title, venue: event2.venue, status: event2.status },
      createdAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
    },
    {
      actorId: tedxOrganizer.id,
      action: 'EVENT_CREATED',
      entity: 'Event',
      entityId: event3.id,
      metadata: { title: event3.title, venue: event3.venue, status: event3.status },
      createdAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
    },
    // Tier quota updates
    {
      actorId: barcampOrganizer.id,
      action: 'TIER_QUOTA_MODIFIED',
      entity: 'TicketTier',
      entityId: event1FirstTierId,
      metadata: { tierName: 'Early Bird', oldCapacity: 80, newCapacity: 100 },
      createdAt: new Date(now.getTime() - 12 * 24 * 3600 * 1000),
    },
    {
      actorId: tedxOrganizer.id,
      action: 'TIER_QUOTA_MODIFIED',
      entity: 'TicketTier',
      entityId: event2FirstTierId,
      metadata: { tierName: 'Student Pass', oldCapacity: 250, newCapacity: 300 },
      createdAt: new Date(now.getTime() - 8 * 24 * 3600 * 1000),
    },
    // User role promotions by Admin
    {
      actorId: admin.id,
      action: 'USER_ROLE_PROMOTED',
      entity: 'User',
      entityId: barcampOrganizer.id,
      metadata: { email: barcampOrganizer.email, previousRole: 'CUSTOMER', newRole: 'ORGANIZER' },
      createdAt: new Date(now.getTime() - 20 * 24 * 3600 * 1000),
    },
    {
      actorId: admin.id,
      action: 'USER_ROLE_PROMOTED',
      entity: 'User',
      entityId: tedxOrganizer.id,
      metadata: { email: tedxOrganizer.email, previousRole: 'CUSTOMER', newRole: 'ORGANIZER' },
      createdAt: new Date(now.getTime() - 18 * 24 * 3600 * 1000),
    },
    // Booking logs (6 samples)
    ...createdBookings.slice(0, 6).map((b, idx) => ({
      actorId: b.userId,
      action: 'BOOKING_CREATED',
      entity: 'Booking',
      entityId: b.id,
      metadata: {
        status: b.status,
        quantity: b.quantity,
        paymentReference: b.paymentReference,
      },
      createdAt: new Date(now.getTime() - (20 - idx) * 3600 * 1000),
    })),
    // Ticket check-in logs (6 samples from checked-in tickets)
    ...createdTickets.slice(0, 6).map((t, idx) => ({
      actorId: admin.id,
      action: 'TICKET_CHECKED_IN',
      entity: 'Ticket',
      entityId: t.id,
      metadata: {
        qrToken: t.qrToken,
        scannerDevice: 'CADT Gate 1 Handheld',
        operator: 'Platform Administrator',
      },
      createdAt: new Date(now.getTime() - (8 - idx) * 20 * 60 * 1000),
    })),
  ];

  for (const log of auditLogsData) {
    await prisma.auditLog.create({
      data: log,
    });
  }

  console.warn('✅ Seed complete successfully.');
  console.warn(`   Users: 1 Admin, 2 Organizers, ${customers.length} Customers`);
  console.warn(`   Events: 3 (${event1.title}, ${event2.title}, ${event3.title})`);
  console.warn(
    `   Bookings: ${createdBookings.length} total (${paidBookings.length} PAID, ${createdBookings.length - paidBookings.length} PENDING)`
  );
  console.warn(
    `   Tickets: ${createdTickets.length} created (${createdTickets.filter((t) => t.status === TicketStatus.CHECKED_IN).length} CHECKED_IN)`
  );
  console.warn(`   AuditLogs: ${auditLogsData.length} records`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
