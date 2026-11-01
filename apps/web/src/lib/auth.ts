/**
 * lib/auth.ts – token storage helpers.
 * MVP session storage: the JWT survives reloads in this tab and is cleared when the tab closes.
 * Never persist the JWT in localStorage.
 */
import type { JwtPayload, Role } from '@argon/shared';

const TOKEN_KEY = 'argon_token';
const REFRESH_TOKEN_KEY = 'argon_refresh_token';

export function getToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const expiresAt = getTokenExpiry(token);
  if (expiresAt === null || expiresAt <= Date.now()) {
    clearAccessToken();
    return null;
  }
  return token;
}

export function hasStoredToken(): boolean {
  return sessionStorage.getItem(TOKEN_KEY) !== null;
}

/** Read the JWT expiry for client-side session handling only; the API verifies the JWT. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload: unknown = JSON.parse(atob(padded));
    if (typeof payload !== 'object' || payload === null || !('exp' in payload)) return null;
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function parseJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || !payload.role) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role as Role,
      email: payload.email,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const expiresAt = getTokenExpiry(token);
  if (expiresAt === null) return true;
  return expiresAt <= Date.now();
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
}

export function setSessionTokens(token: string, refreshToken: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifyAuthChange();
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChange();
}

function notifyAuthChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('argon:auth-change'));
}
