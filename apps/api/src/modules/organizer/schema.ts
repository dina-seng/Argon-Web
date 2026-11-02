/** modules/organizer/schema.ts */
import { z } from 'zod';

export const getEventMetricsParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const updateTierQuotaParamsSchema = z.object({
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
});

export const updateTierQuotaBodySchema = z.object({
  capacity: z.number().int().positive().optional(),
});

export const getAttendeesParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const getAttendeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// Backward-compatible alias
export const eventIdParamSchema = getEventMetricsParamsSchema;

export type GetEventMetricsParams = z.infer<typeof getEventMetricsParamsSchema>;
export type UpdateTierQuotaParams = z.infer<typeof updateTierQuotaParamsSchema>;
export type UpdateTierQuotaBody = z.infer<typeof updateTierQuotaBodySchema>;
export type GetAttendeesParams = z.infer<typeof getAttendeesParamsSchema>;
export type GetAttendeesQuery = z.infer<typeof getAttendeesQuerySchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
