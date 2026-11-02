/** modules/payments/routes.ts */
import type { FastifyInstance } from 'fastify';
import { webhookController } from './controller.js';
export async function paymentsRoutes(app: FastifyInstance) {
  // Parse raw body for signature verification
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (_req, body, done) {
    try {
      (_req as any).rawBody = body;
      const parsed = JSON.parse((body as Buffer).toString()) as unknown;
      done(null, parsed);
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  app.post('/webhook', webhookController);
}
