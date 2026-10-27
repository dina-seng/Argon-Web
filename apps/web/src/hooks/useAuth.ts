/**
 * hooks/useAuth.ts
 * TODO: Return current user, role, login(), logout(), refreshToken() from auth context.
 */
import type { JwtPayload } from '@argon/shared';

export function useAuth(): { user: JwtPayload | null; isLoading: boolean } {
  // TODO: implement with React context
  return { user: null, isLoading: false };
}
