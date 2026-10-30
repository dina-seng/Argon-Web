/**
 * modules/auth/controller.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';
import { registerUser, loginUser } from './service';

export async function registerController(_req: FastifyRequest<{ Body: RegisterInput }>, _reply: FastifyReply): Promise<void> {
  try {
    const result = await registerUser(_req.server, _req.body);
    _reply.status(201).send(result);
  } catch (error) {
    if (error instanceof Error &&
      error.message === 'A user with this email already exists') {
      _reply.status(409).send({ message: error.message });
      return;
    }
    throw error;
  }
}

export async function loginController(_req: FastifyRequest<{ Body: LoginInput }>, _reply: FastifyReply): Promise<void> {
  try {
    const result = await loginUser(_req.server, _req.body);
    _reply.status(200).send(result);
  } catch (error) {
    if (error instanceof Error &&
      error.message === 'Invalid email or password') {
      _reply.status(401).send({ message: error.message });
      return;
    }
    throw error;
  }
}
