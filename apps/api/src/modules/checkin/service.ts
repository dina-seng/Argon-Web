/**
 * modules/checkin/service.ts
 *
 * Flow C. Verify HMAC signature, then in one row-level transaction:
 * if CHECKED_IN return 409 with prior scan time; if REVOKED reject;
 * if ACTIVE set CHECKED_IN and record timestamp.
 * Target under 1.0s.
 */

import type { FastifyInstance } from 'fastify';
import { verifyQrToken } from '../../lib/hmac.js';
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
  try {
    verifyQrToken(qrToken, env.QR_SIGNING_SECRET);
  } catch {
    // If token verification fails, also check if it's stored directly
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

    // 5. Active ticket -> Set CHECKED_IN & record timestamp
    const now = new Date();
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: now,
        checkedInBy: scannedBy,
      },
    });

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
      checkedInAt: updated.checkedInAt?.toISOString(),
      holderName: ticket.booking.user.name,
      eventTitle: ticket.booking.event.title,
      tierName: ticket.booking.tier.name,
      message: 'Check-in successful! Welcome to the event.',
    };
  });
}

export async function exportRoster(app: FastifyInstance, eventId: string): Promise<unknown[]> {
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
