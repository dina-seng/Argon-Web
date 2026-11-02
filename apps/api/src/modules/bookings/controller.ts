/** modules/bookings/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateBookingBody } from './schema.js';
import { createBookingBodySchema } from './schema.js';
import { createBooking, getBooking } from './service.js';

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

export async function getBookingController(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
  const id = req.params.id;
  const booking = await getBooking(req.server, id, req.user.sub);
  reply.send(booking);
}
