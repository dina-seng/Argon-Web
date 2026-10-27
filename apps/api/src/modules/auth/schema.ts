/**
 * modules/auth/schema.ts – Zod schemas for auth endpoints.
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['CUSTOMER', 'ORGANIZER']).default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const tokenResponseSchema = z.object({
  token: z.string(),
  expiresIn: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
