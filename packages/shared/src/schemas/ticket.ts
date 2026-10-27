/**
 * @argon/shared – schemas/ticket.ts
 *
 * Zod schemas for Ticket. Consumed by API (responses) and scanner (roster validation).
 */

import { z } from 'zod';
import { TicketStatus } from '../enums.js';

export const ticketSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.nativeEnum(TicketStatus),
  /**
   * qrToken is a signed opaque string. NEVER expose the signing secret client-side.
   * The token itself is safe to display as a QR code.
   */
  qrToken: z.string(),
  checkedInAt: z.string().datetime().nullable(),
  checkedInBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

/** Roster entry – minimal shape shipped to the scanner. No secrets. */
export const rosterEntrySchema = z.object({
  ticketId: z.string().uuid(),
  qrToken: z.string(),
  status: z.nativeEnum(TicketStatus),
  holderName: z.string(),
});

export type RosterEntry = z.infer<typeof rosterEntrySchema>;
