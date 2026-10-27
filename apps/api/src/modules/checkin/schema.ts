/** modules/checkin/schema.ts */
import { z } from 'zod';
export const scanBodySchema = z.object({ qrToken: z.string() });
export const rosterParamSchema = z.object({ eventId: z.string().uuid() });
