/**
 * modules/auth/controller.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';
import { logoutUser, registerUser, loginUser, refreshUserSession } from './service';

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

export async function refreshController(
  _req: FastifyRequest<{ Body: { refreshToken: string } }>,
  _reply: FastifyReply,
): Promise<void> {
  try {
    const result = await refreshUserSession(_req.server, _req.body.refreshToken);
    _reply.status(200).send(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired refresh token') {
      _reply.status(401).send({ message: error.message });
      return;
    }
    throw error;
  }
}

export async function logoutController(
  _req: FastifyRequest<{ Body: { refreshToken?: string } }>,
  _reply: FastifyReply,
): Promise<void> {
  const authorization = _req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  await logoutUser(_req.server, {
    ...(_req.body.refreshToken ? { refreshToken: _req.body.refreshToken } : {}),
    ...(accessToken ? { accessToken } : {}),
  });
  _reply.status(204).send();
}
