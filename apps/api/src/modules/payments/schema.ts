import { z } from 'zod';

export const webhookBodySchema = z.object({ tran_id: z.string().regex(/^[a-f0-9]{20}$/) }).passthrough();
