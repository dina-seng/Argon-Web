/** modules/tickets/schema.ts */
import { z } from 'zod';
export const ticketIdParamSchema = z.object({ id: z.string().uuid() });
