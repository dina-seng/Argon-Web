/**
 * modules/auth/service.ts
 */

import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { RegisterInput, LoginInput } from './schema';
import { Role as SharedRole } from '@argon/shared';
import bcrypt from 'bcrypt';
import { env } from '../../config/env';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const REFRESH_TOKEN_KEY_PREFIX = 'auth:refresh:';
const REVOKED_ACCESS_TOKEN_KEY_PREFIX = 'auth:revoked:access:';

interface SessionTokens {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function accessTokenKey(accessToken: string): string {
  return `${REVOKED_ACCESS_TOKEN_KEY_PREFIX}${createHash('sha256').update(accessToken).digest('hex')}`;
}

async function createSession(
  app: FastifyInstance,
  user: { id: string; email: string; role: keyof typeof SharedRole },
  refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
): Promise<SessionTokens> {
  const token = app.jwt.sign({
    sub: user.id,
    email: user.email,
    role: SharedRole[user.role],
  });
  const refreshToken = randomBytes(32).toString('base64url');
  const refreshKey = `${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(refreshToken)}`;
  const refreshTtlSeconds = Math.ceil((refreshExpiresAt - Date.now()) / 1000);
  if (refreshTtlSeconds <= 0) throw new Error('Invalid or expired refresh token');
  await app.redis.set(refreshKey, JSON.stringify({ userId: user.id, expiresAt: refreshExpiresAt }), 'EX', refreshTtlSeconds);
  return { token, refreshToken, expiresIn: env.JWT_EXPIRES_IN };
}

export async function registerUser(_app: FastifyInstance, _input: RegisterInput): Promise<SessionTokens> {
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

  return createSession(_app, newUser);
}

export async function loginUser(_app: FastifyInstance, _input: LoginInput): Promise<SessionTokens> {
  const { email, password } = _input;

  const user = await _app.prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  return createSession(_app, user);
}

export async function refreshUserSession(app: FastifyInstance, refreshToken: string): Promise<SessionTokens> {
  const refreshKey = `${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(refreshToken)}`;
  const sessionRecord = await app.redis.eval(
    "local session = redis.call('GET', KEYS[1]); if session then redis.call('DEL', KEYS[1]); return session end; return nil",
    1,
    refreshKey,
  );
  if (typeof sessionRecord !== 'string') throw new Error('Invalid or expired refresh token');

  let session: { userId?: unknown; expiresAt?: unknown };
  try {
    session = JSON.parse(sessionRecord) as { userId?: unknown; expiresAt?: unknown };
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
  if (typeof session.userId !== 'string' || typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
    throw new Error('Invalid or expired refresh token');
  }

  const user = await app.prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new Error('Invalid or expired refresh token');

  return createSession(app, user, session.expiresAt);
}

export async function logoutUser(
  app: FastifyInstance,
  input: { refreshToken?: string; accessToken?: string },
): Promise<void> {
  if (input.refreshToken) {
    await app.redis.del(`${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(input.refreshToken)}`);
  }

  if (input.accessToken) {
    let expiresAt: number | undefined;
    try {
      const claims = app.jwt.verify<{ exp?: number }>(input.accessToken);
      expiresAt = claims.exp;
    } catch {
      // Invalid or expired JWTs cannot authorize further requests.
    }

    if (expiresAt !== undefined) {
      const ttlSeconds = expiresAt - Math.floor(Date.now() / 1000);
      if (ttlSeconds > 0) await app.redis.set(accessTokenKey(input.accessToken), '1', 'EX', ttlSeconds);
    }
  }
}

export async function isAccessTokenRevoked(app: FastifyInstance, accessToken: string): Promise<boolean> {
  return (await app.redis.exists(accessTokenKey(accessToken))) === 1;
}
