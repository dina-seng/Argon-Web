/**
 * modules/auth/service.ts
 */

import type { FastifyInstance } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';
import { Role as SharedRole } from '@argon/shared';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function registerUser(_app: FastifyInstance, _input: RegisterInput): Promise<{ token: string }> {
  const { email, password, name, role } = _input;

  const existingUser = await _app.prisma.user.findUnique({ where: { email } });

  if (existingUser) throw new Error('A user with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await _app.prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
      role,
    },
  });

  // Generate a JWT payload
  const token = _app.jwt.sign({
    sub: newUser.id,
    email: newUser.email,
    role: SharedRole[newUser.role],
  });

  return { token };
}

export async function loginUser(_app: FastifyInstance, _input: LoginInput): Promise<{ token: string }> {
  const { email, password } = _input;

  const user = await _app.prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const token = _app.jwt.sign({
    sub: user.id,
    email: user.email,
    role: SharedRole[user.role],
  });

  return { token };
}
