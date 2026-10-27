/**
 * @argon/shared – schemas/booking.ts
 *
 * Zod schemas for Booking. Used by both the API (validation) and web (form validation).
 */

import { z } from 'zod';
import { BookingStatus } from '../enums.js';

export const createBookingSchema = z.object({
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const bookingSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.nativeEnum(BookingStatus),
  quantity: z.number().int().min(1),
  expiresAt: z.string().datetime().nullable(),
  paymentReference: z.string().nullable(),
  gatewayTransactionId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
