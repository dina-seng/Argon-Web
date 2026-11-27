import type { FastifyRequest } from 'fastify';
import { webhookBodySchema } from './schema.js';
import { reconcilePayment } from './service.js';
import { paymentError, verifyCallback } from './payway.js';

export async function webhookController(req: FastifyRequest) {
  const body = webhookBodySchema.parse(req.body);
  const signature = req.headers['x-payway-hmac-sha512'];
  if (signature !== undefined && (typeof signature !== 'string' || !verifyCallback(body, signature))) {
    throw paymentError(401, 'Invalid PayWay callback signature');
  }
  // Even a signed callback only triggers a server-to-server lookup.
  await reconcilePayment(req.server, body.tran_id);
  return { received: true };
}
