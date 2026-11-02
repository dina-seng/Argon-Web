/** modules/organizer/service.ts – metrics, staff credentials */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { Role } from '@argon/shared';

export async function getEventMetrics(app: FastifyInstance, eventId: string, organizerId: string): Promise<unknown> {
  const event = await app.prisma.event.findUnique({
    where: { id: eventId },
    include: { tiers: true },
  });
  if (!event) throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  if (event.organizerId !== organizerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

  const totalSold = event.tiers.reduce((s, t) => s + t.soldCount, 0);
  const totalReserved = event.tiers.reduce((s, t) => s + t.reservedCount, 0);
  const capacity = event.tiers.reduce((s, t) => s + t.capacity, 0);

  // Sum revenue from PAID bookings
  const paidBookings = await app.prisma.booking.findMany({
    where: { eventId, status: 'PAID' as any },
    include: { tier: true },
  });
  const totalRevenue = paidBookings.reduce((s, b) => s + Number((b.tier as any).price) * b.quantity, 0);

  const checkedIn = await app.prisma.ticket.count({ where: { eventId, status: 'CHECKED_IN' as any } });

  return { totalSold, totalRevenue, totalReserved, checkedIn, capacity };
}

export async function issueStaffCredential(app: FastifyInstance, _organizerId: string, input: { name: string; email: string }): Promise<unknown> {
  const tempPassword = randomBytes(8).toString('hex'); // 16 hex chars
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const staffUser = await app.prisma.user.create({
    data: { email: input.email, name: input.name, password: passwordHash, role: Role.ORGANIZER },
  });
  const token = app.jwt.sign({ sub: staffUser.id, email: staffUser.email, role: Role.ORGANIZER });
  return { email: staffUser.email, tempPassword, token };
}
