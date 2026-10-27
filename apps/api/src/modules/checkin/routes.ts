/** modules/checkin/routes.ts */
import type { FastifyInstance } from 'fastify';
import { scanController, rosterController } from './controller';
export async function checkinRoutes(app: FastifyInstance) {
  app.post('/scan', { preHandler: [app.authenticate], handler: scanController });
  app.get('/roster/:eventId', { preHandler: [app.authenticate], handler: rosterController });
}
