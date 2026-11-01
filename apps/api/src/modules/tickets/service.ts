/**
 * modules/tickets/service.ts – HMAC token minting and retrieval.
 */
import type { FastifyInstance } from 'fastify';
import { signQrToken } from '../../lib/hmac.js';
import { env } from '../../config/env.js';
import { TicketStatus } from '@argon/shared';

export async function mintTickets(
  app: FastifyInstance,
  bookingId: string,
  quantity: number
): Promise<string[]> {
  const booking = await app.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { event: true },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  const mintedTokens: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const payload = `ARG:${booking.id}:${i + 1}:${Date.now()}`;
    const qrToken = signQrToken(payload, env.QR_SIGNING_SECRET);

    await app.prisma.ticket.create({
      data: {
        bookingId: booking.id,
        eventId: booking.eventId,
        status: TicketStatus.ACTIVE,
        qrToken,
      },
    });

    mintedTokens.push(qrToken);
  }

  return mintedTokens;
}

export async function getMyTickets(app: FastifyInstance, userId: string): Promise<unknown[]> {
  const tickets = await app.prisma.ticket.findMany({
    where: {
      booking: {
        userId,
      },
    },
    include: {
      booking: {
        include: {
          tier: true,
          event: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (tickets as any[]).map((t: any) => ({
    id: t.id,
    orderNumber: t.booking.paymentReference ?? t.booking.id.slice(0, 8).toUpperCase(),
    eventId: t.eventId,
    eventTitle: t.booking.event.title,
    eventVenue: t.booking.event.venue,
    eventStartsAt: t.booking.event.startsAt,
    tierName: t.booking.tier.name,
    status: t.status,
    qrToken: t.qrToken,
    checkedInAt: t.checkedInAt,
    createdAt: t.createdAt,
  }));
}
