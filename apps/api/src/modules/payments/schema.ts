/** modules/payments/schema.ts */
import { z } from 'zod';
export const webhookBodySchema = z.object({ event: z.string(), bookingReference: z.string(), gatewayTransactionId: z.string(), amount: z.number() });
export type WebhookBody = z.infer<typeof webhookBodySchema>;
