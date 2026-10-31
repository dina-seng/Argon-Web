/**
 * @argon/shared – schemas/event.ts
 *
 * Zod schemas for Event and TicketTier. Shared between API and web forms.
 */

import { z } from 'zod';
import { EventCategory, EventStatus } from '../enums.js';

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
  category: z.nativeEnum(EventCategory),
  /** Cover poster. Null until uploads exist; the UI shows a category placeholder. */
  coverImageUrl: z.string().url().nullable(),
  status: z.nativeEnum(EventStatus),
  tiers: z.array(ticketTierSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Upper bound for the organizer's "total ticket capacity" input. */
export const MAX_EVENT_CAPACITY = 100_000;

const eventInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000),
  venue: z.string().trim().min(1, 'Location is required').max(300),
  startsAt: z.string().datetime({ offset: true, message: 'Enter a valid date and time' }),
  category: z.nativeEnum(EventCategory),
  /** Total ticket capacity. Stored on the event's default "General Admission" tier. */
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(MAX_EVENT_CAPACITY),
});

const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

export const createEventSchema = eventInputSchema.refine((e) => isFuture(e.startsAt), {
  path: ['startsAt'],
  message: 'Event date must be in the future',
});

export const updateEventSchema = eventInputSchema
  .partial()
  .refine((e) => e.startsAt === undefined || isFuture(e.startsAt), {
    path: ['startsAt'],
    message: 'Event date must be in the future',
  });

/** Status changes an organizer may request. See docs/state-machines.md. */
export const updateEventStatusSchema = z.object({
  status: z.enum([EventStatus.PUBLISHED, EventStatus.CANCELLED]),
});

/** Row shown on the organizer dashboard: an event plus ticket totals across its tiers. */
export const organizerEventSchema = eventSchema.omit({ tiers: true }).extend({
  capacity: z.number().int(),
  soldCount: z.number().int(),
});

/** Customer feed filters (GET /events). Only published, upcoming events are ever returned. */
export const EVENTS_PAGE_SIZE = 12;

export const listEventsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.nativeEnum(EventCategory).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(EVENTS_PAGE_SIZE),
});

/** Event as customers see it on the feed. */
export const publicEventSchema = eventSchema
  .pick({ id: true, title: true, description: true, venue: true, startsAt: true, category: true, coverImageUrl: true })
  .extend({
    organizerName: z.string(),
    capacity: z.number().int(),
    ticketsRemaining: z.number().int(),
    /** Cheapest ticket tier price (0 = free). */
    minPrice: z.number().nonnegative(),
  });

/** Event detail page: adds the ticket tiers a customer can choose from. */
export const publicEventDetailSchema = publicEventSchema.extend({
  tiers: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      price: z.number().nonnegative(),
      remaining: z.number().int(),
    }),
  ),
});

export type TicketTier = z.infer<typeof ticketTierSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type UpdateEventStatusInput = z.infer<typeof updateEventStatusSchema>;
export type OrganizerEvent = z.infer<typeof organizerEventSchema>;
