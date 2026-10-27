/**
 * @argon/shared – schemas/event.ts
 *
 * Zod schemas for Event and TicketTier. Shared between API and web forms.
 */

import { z } from 'zod';
import { EventStatus } from '../enums.js';

export const ticketTierSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().nonnegative(),
  capacity: z.number().int().min(1),
  soldCount: z.number().int().min(0),
  reservedCount: z.number().int().min(0),
});

export const eventSchema = z.object({
  id: z.string().uuid(),
  organizerId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  venue: z.string().min(1).max(300),
  startsAt: z.string().datetime(),
  status: z.nativeEnum(EventStatus),
  tiers: z.array(ticketTierSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createEventSchema = eventSchema.pick({
  title: true,
  description: true,
  venue: true,
  startsAt: true,
});

export type TicketTier = z.infer<typeof ticketTierSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
