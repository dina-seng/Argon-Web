/** modules/organizer/service.ts – TODO: metrics, staff credentials */
import type { FastifyInstance } from 'fastify';
export async function getEventMetrics(_app: FastifyInstance, _eventId: string): Promise<unknown> { throw new Error('Not implemented'); }
export async function issueStaffCredential(_app: FastifyInstance, _organizerId: string): Promise<unknown> { throw new Error('Not implemented'); }
