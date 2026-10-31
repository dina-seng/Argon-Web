/** modules/tickets/routes.ts */
import type { FastifyInstance } from 'fastify';
import { getMyTicketsController } from './controller.js';
export async function ticketsRoutes(app: FastifyInstance) {
  app.get('/my', { preHandler: [app.authenticate], handler: getMyTicketsController });
}
