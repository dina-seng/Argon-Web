/** modules/payments/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { handlePaymentWebhook, type WebhookPayload } from './service.js';

export async function webhookController(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const payload = req.body as WebhookPayload;
  const signature = req.headers['x-gateway-signature'] as string;
  const rawBody = (req as any).rawBody as Buffer;

  try {
    await handlePaymentWebhook(req.server, payload, rawBody, signature);
    reply.send({ received: true });
  } catch (err: any) {
    if (err?.statusCode === 401) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: err.message });
    }
    if (err?.statusCode === 404) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: err.message });
    }
    if (err?.statusCode === 409) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: err.message });
    }
    throw err;
  }
}
