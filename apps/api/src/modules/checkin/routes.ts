/** modules/checkin/routes.ts */
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { scanController, rosterController } from './controller.js';

export async function checkinRoutes(app: FastifyInstance) {
  const checkinAuth = [app.authenticate, app.authorize([Role.ORGANIZER, Role.ADMIN])];

  app.post('/scan', { preHandler: checkinAuth, handler: scanController });
  app.get('/roster/:eventId', { preHandler: checkinAuth, handler: rosterController });
}
