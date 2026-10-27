/** modules/organizer/schema.ts */
import { z } from 'zod';
export const eventIdParamSchema = z.object({ eventId: z.string().uuid() });
