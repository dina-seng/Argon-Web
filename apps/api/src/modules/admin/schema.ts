/**
 * modules/admin/schema.ts – Zod validation schemas for platform administration.
 */

import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const updateUserRoleParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const updateUserRoleBodySchema = z.object({
  role: z.enum(['CUSTOMER', 'ORGANIZER', 'ADMIN']),
});

export const getUsersQuerySchema = z.object({
  role: z.enum(['CUSTOMER', 'ORGANIZER', 'ADMIN']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const forceConfirmParamsSchema = z.object({
  bookingId: z.string().uuid(),
});

export const refundBookingParamsSchema = z.object({
  bookingId: z.string().uuid(),
});

export const getAuditLogsQuerySchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminBookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
});

export type UpdateUserRoleParams = z.infer<typeof updateUserRoleParamsSchema>;
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type ForceConfirmParams = z.infer<typeof forceConfirmParamsSchema>;
export type RefundBookingParams = z.infer<typeof refundBookingParamsSchema>;
export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>;
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;
