/**
 * @argon/shared – enums
 *
 * Centralised enums shared across apps/web, apps/scanner, and apps/api.
 * These mirror the Prisma enums in apps/api/prisma/schema.prisma.
 */

export enum Role {
  CUSTOMER = 'CUSTOMER',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  CHECKED_IN = 'CHECKED_IN',
  REVOKED = 'REVOKED',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EventCategory {
  MUSIC = 'MUSIC',
  SPORTS = 'SPORTS',
  FOOD = 'FOOD',
  ARTS = 'ARTS',
  TECH = 'TECH',
  OTHER = 'OTHER',
}
