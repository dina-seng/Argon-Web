/**
 * modules/auth/service.ts
 * TODO: Implement register (hash password with bcrypt), login (verify hash, sign JWT).
 */

import type { FastifyInstance } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';

export async function registerUser(_app: FastifyInstance, _input: RegisterInput): Promise<{ token: string }> {
  // TODO: implement
  throw new Error('Not implemented');
}

export async function loginUser(_app: FastifyInstance, _input: LoginInput): Promise<{ token: string }> {
  // TODO: implement
  throw new Error('Not implemented');
}
