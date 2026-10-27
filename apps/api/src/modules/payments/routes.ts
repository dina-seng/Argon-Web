/** modules/payments/routes.ts */
import type { FastifyInstance } from 'fastify';
import { webhookController } from './controller';
export async function paymentsRoutes(app: FastifyInstance) {
  // Raw body needed for signature verification – TODO: configure addContentTypeParser
  app.post('/webhook', webhookController);
}
