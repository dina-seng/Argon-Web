import type { FastifyInstance } from 'fastify';
import { webhookController } from './controller.js';

export async function paymentsRoutes(app: FastifyInstance) {
  app.post('/webhook', webhookController);
}
