/** modules/audit/schema.ts */
import { z } from 'zod';
export const auditQuerySchema = z.object({ entityId: z.string().uuid().optional(), entity: z.string().optional() });
