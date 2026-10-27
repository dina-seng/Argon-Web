/**
 * @argon/shared – types
 *
 * Shared TypeScript types and interfaces derived from Zod schemas.
 * Import inferred types from schemas/ for runtime-validated shapes.
 */

import type { z } from 'zod';
import type { bookingSchema, ticketSchema, eventSchema } from './schemas/index.js';
import type { Role, BookingStatus, TicketStatus, EventStatus } from './enums.js';

// Re-export enum types for convenience
export type { Role, BookingStatus, TicketStatus, EventStatus };

// Zod-inferred types
export type Booking = z.infer<typeof bookingSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type Event = z.infer<typeof eventSchema>;

/** JWT payload embedded in all auth tokens. */
export interface JwtPayload {
  sub: string; // User ID
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

/** QR token payload (signed with HMAC-SHA256). */
export interface QrTokenPayload {
  ticketId: string;
  bookingId: string;
  eventId: string;
  /** UNIX timestamp (seconds) when the token was minted */
  mintedAt: number;
}

/** Standard API error response shape. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

/** Paginated response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
