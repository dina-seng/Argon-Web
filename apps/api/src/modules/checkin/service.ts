/**
 * modules/checkin/service.ts
 *
 * Flow C. Verify HMAC signature, then in one row-level transaction:
 * if CHECKED_IN return 409 with prior scan time; if REVOKED reject;
 * if ACTIVE set CHECKED_IN and record timestamp.
 * Target under 1.0s.
 */

import type { FastifyInstance } from 'fastify';
import { verifyHmacSignature } from '../../lib/hmac.js';
import { env } from '../../config/env.js';
import { TicketStatus } from '@argon/shared';

export interface ScanResult {
  outcome: 'CHECKED_IN' | 'DUPLICATE' | 'REVOKED' | 'INVALID';
  checkedInAt?: string;
  priorCheckedInAt?: string;
  holderName?: string;
  eventTitle?: string;
  tierName?: string;
  message?: string;
}

export async function scanTicket(
  app: FastifyInstance,
  qrToken: string,
  scannedBy: string
): Promise<ScanResult> {
  // 1. Verify HMAC token signature if secret signing is active
  if (qrToken.includes('.') || qrToken.includes(':')) {
    const valid =
      verifyHmacSignature(qrToken, env.QR_SIGNING_SECRET) ||
      (env.QR_HMAC_SECRET ? verifyHmacSignature(qrToken, env.QR_HMAC_SECRET) : false);

    if (!valid) {
      return {
        outcome: 'INVALID',
        message: 'Invalid ticket signature or tampered QR code.',
      };
    }
  }

  // 2. Row-level transaction to prevent race conditions during gate check-in
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app.prisma as any).$transaction(async (tx: any) => {
    const ticket = await tx.ticket.findUnique({
      where: { qrToken },
      include: {
        booking: {
          include: {
            user: true,
            tier: true,
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        outcome: 'INVALID',
        message: 'Ticket token not found in event registry.',
      };
    }

    // 3. Duplicate check-in attempt -> 409 Conflict with prior check-in timestamp
    if (ticket.status === TicketStatus.CHECKED_IN) {
      return {
        outcome: 'DUPLICATE',
        checkedInAt: ticket.checkedInAt?.toISOString(),
        priorCheckedInAt: ticket.checkedInAt?.toISOString(),
        holderName: ticket.booking.user.name,
        eventTitle: ticket.booking.event.title,
        tierName: ticket.booking.tier.name,
        message: `Ticket already checked in at ${ticket.checkedInAt?.toISOString()}`,
      };
    }

    // 4. Revoked / Cancelled ticket
    if (ticket.status === TicketStatus.REVOKED) {
      return {
        outcome: 'REVOKED',
        holderName: ticket.booking.user.name,
        message: 'Ticket has been revoked or expired.',
      };
    }

    // 5. Active ticket -> Atomic conditional update to prevent concurrent double-admissions
    const now = new Date();
    const { count } = await tx.ticket.updateMany({
      where: {
        id: ticket.id,
        status: TicketStatus.ACTIVE,
      },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: now,
        checkedInBy: scannedBy,
      },
    });

    if (count === 0) {
      const fresh = await tx.ticket.findUnique({ where: { id: ticket.id } });
      if (fresh?.status === TicketStatus.CHECKED_IN) {
        return {
          outcome: 'DUPLICATE',
          checkedInAt: fresh.checkedInAt?.toISOString(),
          priorCheckedInAt: fresh.checkedInAt?.toISOString(),
          holderName: ticket.booking.user.name,
          eventTitle: ticket.booking.event.title,
          tierName: ticket.booking.tier.name,
          message: `Ticket already checked in at ${fresh.checkedInAt?.toISOString()}`,
        };
      }
      return {
        outcome: 'REVOKED',
        holderName: ticket.booking.user.name,
        message: 'Ticket has been revoked or expired.',
      };
    }

    // Record in AuditLog
    await tx.auditLog.create({
      data: {
        actorId: scannedBy,
        action: 'TICKET_CHECKED_IN',
        entity: 'Ticket',
        entityId: ticket.id,
        metadata: {
          qrToken,
          holderName: ticket.booking.user.name,
          checkedInAt: now.toISOString(),
        },
      },
    });

    return {
      outcome: 'CHECKED_IN',
      checkedInAt: now.toISOString(),
      holderName: ticket.booking.user.name,
      eventTitle: ticket.booking.event.title,
      tierName: ticket.booking.tier.name,
      message: 'Check-in successful! Welcome to the event.',
    };
  });
}

export async function exportRoster(
  app: FastifyInstance,
  eventId: string,
  userId?: string,
  isAdmin?: boolean
): Promise<unknown[]> {
  const event = await app.prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true },
  });

  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }

  if (userId && !isAdmin && event.organizerId !== userId) {
    throw Object.assign(new Error('Forbidden: You are not authorized to access this event roster'), { statusCode: 403 });
  }

  const tickets = await app.prisma.ticket.findMany({
    where: { eventId },
    include: {
      booking: {
        include: {
          user: true,
        },
      },
    },
  });

  return (tickets as any[]).map((t: any) => ({
    ticketId: t.id,
    qrToken: t.qrToken,
    status: t.status,
    holderName: t.booking?.user?.name ?? 'Attendee',
  }));
}
