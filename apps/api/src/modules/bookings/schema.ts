/** modules/bookings/schema.ts */
import { z } from 'zod';
export const createBookingBodySchema = z.object({ tierId: z.string().uuid(), eventId: z.string().uuid(), quantity: z.number().int().min(1).max(10) });
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
