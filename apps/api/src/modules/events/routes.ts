/** modules/events/routes.ts */
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import {
  listEventsController,
  getEventController,
  createEventController,
  updateEventController,
  updateEventStatusController,
} from './controller.js';
import {
  createEventSchema,
  eventParamsSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateEventStatusSchema,
} from './schema.js';

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/', { schema: { querystring: listEventsQuerySchema }, handler: listEventsController });
  app.get('/:id', { schema: { params: eventParamsSchema }, handler: getEventController });

  const organizerAuth = [app.authenticate, app.authorize([Role.ORGANIZER, Role.ADMIN])];
  app.post('/', { preHandler: organizerAuth, schema: { body: createEventSchema }, handler: createEventController });
  app.patch('/:id', {
    preHandler: organizerAuth,
    schema: { params: eventParamsSchema, body: updateEventSchema },
    handler: updateEventController,
  });
  app.patch('/:id/status', {
    preHandler: organizerAuth,
    schema: { params: eventParamsSchema, body: updateEventStatusSchema },
    handler: updateEventStatusController,
  });
}
