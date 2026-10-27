/**
 * modules/auth/controller.ts
 * TODO: Thin handler layer – delegate to service, return responses.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';

export async function registerController(_req: FastifyRequest<{ Body: RegisterInput }>, _reply: FastifyReply): Promise<void> {
  // TODO: call registerUser service
}

export async function loginController(_req: FastifyRequest<{ Body: LoginInput }>, _reply: FastifyReply): Promise<void> {
  // TODO: call loginUser service
}
