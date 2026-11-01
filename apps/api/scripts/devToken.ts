/**
 * scripts/devToken.ts – prints a JWT for a seeded user so organizer pages can be tested
 * before login is implemented. Local development only.
 *
 * Run with: npm run dev:token [email]   (default: organizer@argon.dev from prisma/seed.ts)
 */

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import type { JwtPayload, Role } from '@argon/shared';
import { env } from '../src/config/env';

if (env.NODE_ENV === 'production') {
  console.error('dev:token is for local development only.');
  process.exit(1);
}

const email = process.argv[2] ?? 'organizer@argon.dev';
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email } });
await prisma.$disconnect();

if (!user) {
  console.error(`No user with email ${email}. Run \`npm run prisma:seed\` first.`);
  process.exit(1);
}

const app = Fastify();
await app.register(fastifyJwt, { secret: env.JWT_SECRET, sign: { expiresIn: '8h' } });
await app.ready();

const payload: JwtPayload = { sub: user.id, role: user.role as Role, email: user.email };
const token = app.jwt.sign(payload);
await app.close();

process.stdout.write(
  [
    `Token for ${email} (${user.role}), valid 8h:`,
    '',
    token,
    '',
    'Paste this in the browser console on http://localhost:5173, then reload:',
    '',
    `sessionStorage.setItem('argon_token', '${token}')`,
    '',
  ].join('\n'),
);
