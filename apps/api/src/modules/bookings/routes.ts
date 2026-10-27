/** modules/bookings/routes.ts – Checkout is rate-limited */
import type { FastifyInstance } from 'fastify';
import { createBookingController, getBookingController } from './controller';
export async function bookingsRoutes(app: FastifyInstance) {
  // Rate-limited checkout endpoint
  app.post('/', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, handler: createBookingController });
  app.get('/:id', { preHandler: [app.authenticate], handler: getBookingController });
}
