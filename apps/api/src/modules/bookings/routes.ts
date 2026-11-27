/** modules/bookings/routes.ts – Checkout is rate-limited */
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { createBookingController, createPaymentController, getBookingController, simulatePaymentController } from './controller.js';
import { payWayConfigured } from '../payments/payway.js';
export async function bookingsRoutes(app: FastifyInstance) {
  // Rate-limited checkout endpoint with auth
  app.post('/', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, preHandler: [app.authenticate], handler: createBookingController });
  app.get('/:id', { preHandler: [app.authenticate], handler: getBookingController });
  app.post('/:id/payment', { preHandler: [app.authenticate], handler: createPaymentController });
  if (env.NODE_ENV !== 'production' && env.ALLOW_PAYMENT_SIMULATION === 'true' && !payWayConfigured()) {
    app.post('/:id/simulate-payment', { preHandler: [app.authenticate], handler: simulatePaymentController });
  }
}
