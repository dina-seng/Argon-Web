/** modules/events/routes.ts */
import type { FastifyInstance } from 'fastify';
import { listEventsController, getEventController } from './controller';
export async function eventsRoutes(app: FastifyInstance) {
  app.get('/', listEventsController);
  app.get('/:id', getEventController);
  // TODO: POST, PATCH with ORGANIZER auth guard
}
