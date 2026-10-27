/** modules/events/schema.ts – TODO: event CRUD Zod schemas */
import { z } from 'zod';
export const listEventsQuerySchema = z.object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(20), q: z.string().optional() });
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
