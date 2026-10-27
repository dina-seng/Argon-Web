/** modules/bookings/controller.ts – TODO: delegate to service */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateBookingBody } from './schema';
export async function createBookingController(_req: FastifyRequest<{ Body: CreateBookingBody }>, _reply: FastifyReply): Promise<void> { /* TODO */ }
export async function getBookingController(_req: FastifyRequest, _reply: FastifyReply): Promise<void> { /* TODO */ }
