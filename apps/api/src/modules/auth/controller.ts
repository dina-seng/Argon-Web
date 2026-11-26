/**
 * modules/auth/controller.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RegisterInput, LoginInput } from './schema.js';
import { logoutUser, registerUser, loginUser, refreshUserSession } from './service.js';

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

export async function meController(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'User not logged in' });
  }

  const user = await req.server.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuspended: true,
      createdAt: true,
    },
  });

  if (!user) {
    return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
  }

  reply.send(user);
}
