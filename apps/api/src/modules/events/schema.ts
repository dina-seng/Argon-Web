/** modules/events/schema.ts – event Zod schemas (bodies come from @argon/shared) */
import { z } from 'zod';
export { createEventSchema, updateEventSchema, updateEventStatusSchema, listEventsQuerySchema } from '@argon/shared';
export const eventParamsSchema = z.object({ id: z.string().uuid() });
export type EventParams = z.infer<typeof eventParamsSchema>;
