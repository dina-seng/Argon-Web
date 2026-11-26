/** modules/bookings/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateBookingBody } from './schema.js';
import { createBookingBodySchema } from './schema.js';
import { createBooking, getBooking, simulatePayment } from './service.js';

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

export async function getBookingController(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = req.params as { id: string };
  const isAdmin = req.user.role === 'ADMIN';
  const booking = await getBooking(req.server, id, req.user.sub, isAdmin);
  reply.send(booking);
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
