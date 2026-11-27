/** modules/bookings/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { CreateBookingBody } from './schema.js';
import { createBookingBodySchema } from './schema.js';
import { createBooking, getBooking, simulatePayment } from './service.js';
import { createPayment, reconcilePayment } from '../payments/service.js';

export async function createBookingController(req: FastifyRequest<{ Body: CreateBookingBody }>, reply: FastifyReply): Promise<void> {
  const body = createBookingBodySchema.parse(req.body);
  try {
    const booking = await createBooking(req.server, {
      userId: req.user.sub,
      tierId: body.tierId,
      eventId: body.eventId,
      quantity: body.quantity,
    });
    reply.code(201).send(booking);
  } catch (err: any) {
    if (err?.statusCode === 409) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: err.message });
    }
    throw err;
  }
}

export async function getBookingController(
  req: FastifyRequest<{ Params: { id: string }; Querystring: { checkPayment?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  let booking = await getBooking(req.server, id, req.user.sub, isAdmin);
  if (req.query.checkPayment === 'true' && booking.status === 'PENDING' && booking.paymentExpiresAt && booking.paymentReference) {
    try {
      await reconcilePayment(req.server, booking.paymentReference);
      booking = await getBooking(req.server, id, req.user.sub, isAdmin);
    } catch (err) {
      req.log.warn({ err, bookingId: id }, 'Could not refresh PayWay payment status');
    }
  }
  reply.send(booking);
}

export async function createPaymentController(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { method } = z.object({ method: z.enum(['KHQR', 'CARD']).default('KHQR') }).parse(req.body ?? {});
  const payment = await createPayment(req.server, req.params.id, req.user.sub, method);
  return reply.header('Cache-Control', 'no-store').send(payment);
}

export async function simulatePaymentController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { id } = req.params as { id: string };
  const isAdmin = req.user.role === 'ADMIN';
  const booking = await simulatePayment(req.server, id, req.user.sub, isAdmin);
  reply.send(booking);
}
